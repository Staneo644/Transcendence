import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Game } from './Game.class';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { UserService } from 'src/user/user.service';
import { AuthService } from 'src/auth/auth.service';
import { ChannelService } from 'src/channel/channel.service';
import { GameService } from 'src/game/game.service';
import { CreateGameDTO } from 'src/dto/create-game.dto';
import { UserStatus } from 'src/utils/user.enum';
import {
  disconnect,
  getdualrequest,
  getKeys,
  getSocketFromId,
  getSockets,
  send_connection_server,
  verifyToken,
  wrongtoken,
} from 'src/utils/socket.function';
import { sleep } from '../utils/sleep';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private clients: string[] = [];
  private ingame: Map<string, string> = new Map<string, string>();
  private games: Map<string, Game> = new Map<string, Game>();
  private rematch: Map<string, boolean> = new Map<string, boolean>();
  private matchmaking: Array<Socket> = [];
  private logger: Logger = new Logger('EventsGateway');
  private dual: Map<string, string> = new Map<string, string>();

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private channelService: ChannelService,
    private gameService: GameService,
  ) {}

  sendconnected() {
    send_connection_server(getSockets(this.server), this.ingame, this.server);
  }

  afterInit() {
    this.logger.log('Socket server initialized');
    this.server.setMaxListeners(20);
  }

  async handleDisconnect(client: Socket) {
    const id = client.data.id;
    if (id == null) {
      client.disconnect();
      return;
    }
    this.logger.log(`Client disconnected: ${id}`);
    this.clients = disconnect(id, this.clients);
    if (getKeys(this.ingame).includes(id)) {
      const game = await this.gameService.remakeGame(this.ingame.get(id));
      if (game == null) {
        this.logger.error('game not found');
        return;
      }
      const ingame = await this.games[game.id];
      this.ingame.delete(ingame.getUser1().data.id);
      this.ingame.delete(ingame.getUser2().data.id);
      this.sendconnected();
      await ingame.remake();
      this.games.delete(game.id);
    }
    if ((await this.userService.changeStatus(id, UserStatus.OFFLINE)) == null) {
      wrongtoken(client, 'connection');
      this.clients = disconnect(id, this.clients);
      this.sendconnected();
    }
    if (this.matchmaking.includes(client)) {
      this.matchmaking.splice(this.matchmaking.indexOf(client), 1);
    }
    this.sendconnected();
  }

  //on connection
  async handleConnection(client: Socket) {
    client.setMaxListeners(20);
    let id;
    await client.on('connection', async (data) => {
      try {
        id = this.authService.getIdFromToken(data.token);
      } catch (error) {
        wrongtoken(client, 'connection');
        data.id = null;
        return;
      }
      if (id == null || getSocketFromId(id, getSockets(this.server)) != null) {
        wrongtoken(client, 'connection');
        return;
      }
      if (
        (await this.userService.changeStatus(id, UserStatus.CONNECTED)) == null
      ) {
        wrongtoken(client, 'connection');
        return;
      }
      client.data.id = id;
      this.sendconnected();
      let channels = null;
      try {
        channels = await this.channelService.getAccessibleChannels(id);
      } catch (error) {
        wrongtoken(client, 'connection');
        return;
      }
      if (channels == null) {
        wrongtoken(client, 'connection');
        return;
      }
      for (const channel of channels) {
        client.join(channel.id);
      }
      this.logger.log(`Client connected: ${id}`);
      this.sendconnected();
    });
  }

  @SubscribeMessage('join_matchmaking')
  async join_matchmaking(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'join_matchmaking');
      return;
    }
    const id = client.data.id;
    if (getKeys(this.ingame).includes(id)) {
      const send = {
        code: 1,
        message: 'You are already in a game',
      };
      client.emit('matchmaking_code', send);
      return;
    }
    let i = 0;
    this.sendconnected();
    while (i < this.matchmaking.length) {
      const player = this.matchmaking[i];
      if (player.id == client.id) {
        const send = {
          code: 1,
          message: 'You are already in matchmaking',
        };
        client.emit('matchmaking_code', send);
        return;
      }
      i++;
    }
    this.logger.log(id + ' has joined matchmaking');
    this.matchmaking.push(client);
    const send = {
      code: 0,
    };
    this.sendconnected();
    client.emit('matchmaking_code', send);
    this.check_matchmaking();
  }

  async check_matchmaking() {
    let i = 0;
    while (i < this.matchmaking.length) {
      const player = this.matchmaking[i];
      const authorized_player = [];
      let j = 0;
      while (j < this.matchmaking.length) {
        const pretended_player = this.matchmaking[j];
        const player_id = player.data.id;
        const pretended_player_id = pretended_player.data.id;
        if (
          pretended_player_id != null &&
          pretended_player_id != player_id &&
          !(await this.userService.OneOfTwoBlocked(
            pretended_player_id,
            player_id,
          ))
        ) {
          authorized_player.push(pretended_player);
        }
        j++;
      }
      if (authorized_player.length > 0) {
        const rival =
          authorized_player[
            Math.floor(Math.random() * authorized_player.length)
          ];
        if (this.server.sockets.sockets.get(player.id) == null) {
          const tempmatchmaking = [];
          for (const p of this.matchmaking) {
            if (p.id != player.id) {
              tempmatchmaking.push(p);
            }
          }
          this.matchmaking = tempmatchmaking;
          this.check_matchmaking();
          return;
        }
        if (this.server.sockets.sockets.get(rival.id) == null) {
          const tempmatchmaking = [];
          for (const p of this.matchmaking) {
            if (p.id != rival.id) {
              tempmatchmaking.push(p);
            }
          }
          this.matchmaking = tempmatchmaking;
          this.check_matchmaking();
          return;
        }
        if (
          this.server.sockets.sockets.get(player.id) != null ||
          this.server.sockets.sockets.get(rival.id) != null
        ) {
          await this.play_game(player, rival);
        }
      }
      i++;
    }
  }

  async play_game(player: Socket, rival: Socket) {
    const create_gameDTO = new CreateGameDTO();
    create_gameDTO.user1_id = player.data.id;
    create_gameDTO.user2_id = rival.data.id;
    if (create_gameDTO.user1_id == null || create_gameDTO.user2_id == null) {
      player.emit('game_found', {
        game_id: null,
        user: null,
        rival: null,
        decided: false,
      });
      return;
    }
    await this.userService.changeStatus(
      create_gameDTO.user1_id,
      UserStatus.IN_GAME,
    );
    await this.userService.changeStatus(
      create_gameDTO.user2_id,
      UserStatus.IN_GAME,
    );
    const create_game = await this.gameService.createGame(create_gameDTO);
    this.ingame.set(create_gameDTO.user1_id, create_game.id);
    this.ingame.set(create_gameDTO.user2_id, create_game.id);
    this.sendconnected();
    const FirstDecide = Math.random() < 0.5;
    player.emit('game_found', {
      game_id: create_game.id,
      user: 1,
      rival: create_gameDTO.user2_id,
      decide: FirstDecide,
    });
    rival.emit('game_found', {
      game_id: create_game.id,
      user: 2,
      rival: create_gameDTO.user1_id,
      decide: !FirstDecide,
    });
    player.join(create_game.id);
    rival.join(create_game.id);
    const game = new Game(
      create_game.id,
      player,
      rival,
      this.server,
      this.gameService,
    );
    this.games[game.getId()] = game;
    const tempmatchmaking = [];
    for (const t of this.matchmaking) {
      if (t.id != rival.id && player.id != t.id) {
        tempmatchmaking.push(player);
      }
    }
    this.matchmaking = tempmatchmaking;
    this.server.to(game.getId()).emit('game_created', game.getId());
    this.logger.log('game ' + game.getId() + ' created ');
  }

  @SubscribeMessage('option_send')
  async option_send(client: Socket, payload: any) {
    const user_id = client.data.id;

    const game_id = this.ingame.get(user_id);
    if (game_id == null) {
      return;
    }
    const game: Game = this.games[game_id];
    if (game == null) {
      return;
    }

    game.definePowerUp(payload.powerup);
    this.server.to(game_id).emit('will_started', { time: 3 });
    await sleep(1000);
    this.server.to(game_id).emit('option_receive', payload);
    this.server.to(game_id).emit('will_started', { time: 2 });
    await sleep(1000);
    this.server.to(game_id).emit('will_started', { time: 1 });
    await sleep(1000);
    this.server.to(game_id).emit('will_started', { time: 0 });
    await sleep(1000);
    game.start();
  }

  @SubscribeMessage('input_game')
  async input_game(client: Socket, payload: any) {
    const game_id = payload.game_id;
    const type = payload.type;
    this.games[game_id].updateRacket(client, type);
    this.server
      .to(game_id)
      .emit('update_game', this.games[game_id].getGameInfo());
  }

  @SubscribeMessage('leave_matchmaking')
  async leave_matchmaking(client: Socket, payload: any) {
    const tempmatchmaking = [];
    let send = {
      code: 1,
    };
    for (const t of this.matchmaking) {
      if (t.id != client.id) {
        tempmatchmaking.push(t);
        send = {
          code: 0,
        };
      }
    }
    this.matchmaking = tempmatchmaking;
    client.emit('matchmaking_code', send);
  }

  @SubscribeMessage('game_finished')
  async game_finished(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'game_finished');
      return;
    }
    const rematch = payload.rematch;
    const id = client.data.id;
    const game_id = this.ingame.get(id);
    const game = this.games[game_id];
    if (game != null) {
      if (!rematch) {
        this.games.delete(game_id);
        game.getUser1().emit('rematch', { rematch: false });
        game.getUser2().emit('rematch', { rematch: false });
        this.ingame.delete(game.getUser1().data.id);
        this.ingame.delete(game.getUser2().data.id);
      } else {
        if (this.rematch.get(game_id) == null) {
          this.rematch.set(game_id, true);
          const send = {
            rematch: true,
          };
          if (game.getUser1().id == client.id) {
            game.getUser2().emit('rematch', send);
          }
          if (game.getUser2().id == client.id) {
            game.getUser1().emit('rematch', send);
          }
        } else {
          this.rematch.delete(game_id);
          const send = {
            rematch: true,
          };
          game.getUser1().emit('rematch', send);
          game.getUser2().emit('rematch', send);
          this.ingame.delete(game.getUser1().data.id);
          this.ingame.delete(game.getUser2().data.id);
          this.rematch.delete(game_id);
          this.play_game(game.getUser1(), game.getUser2());
          return;
        }
      }
    }
  }

  @SubscribeMessage('challenge')
  async dual_request(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'challenge');
      return;
    }
    const rival_id = payload.rival_id;
    if (await this.userService.OneOfTwoBlocked(client.data.id, rival_id)) {
      client.emit('receive_challenge', {
        message: 'you are blocked',
        code: 1,
      });
      return;
    }
    const socket = getSocketFromId(rival_id, getSockets(this.server));
    const user = await this.userService.getUserById(client.data.id);
    if (socket != null) {
      const rival_request = getdualrequest(this.dual, rival_id);
      if (rival_request == null) {
        this.dual.set(client.data.id, rival_id);
        client.emit('receive_challenge', {
          message: 'challenge sent',
          code: 0,
        });
        socket.emit('receive_challenge', {
          message: 'challenge received',
          rival: client.data.id,
          rival_name: user.username,
          code: 2,
        });
      } else {
        if (rival_request == client.data.id) {
          this.dual.delete(rival_id);
          client.emit('receive_challenge', {
            message: 'challenge accepted',
            code: 3,
          });
          socket.emit('receive_challenge', {
            message: 'challenge accepted',
            code: 3,
          });
          this.play_game(socket, client);
        }
      }
    } else {
      client.emit('receive_challenge', {
        message: 'user is not connected',
        code: 1,
      });
    }
  }

  @SubscribeMessage('logout')
  async disconnect_socket(client: Socket, payload: any) {
    client.disconnect();
  }

  @SubscribeMessage('leave_game')
  async leave_game(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'leave_game');
      return;
    }
    const id = client.data.id;
    const game_id = this.ingame.get(id);
    const game = this.games[game_id];
    if (game != null) {
      this.ingame.delete(client.data.id);
      this.ingame.delete(client.data.id);
      await this.userService.changeStatus(
        game.getUser1().data.id,
        UserStatus.CONNECTED,
      );
      await this.userService.changeStatus(
        game.getUser2().data.id,
        UserStatus.CONNECTED,
      );
      this.sendconnected();
      game.remake();
    } else {
      this.ingame.delete(id);
    }
  }
}
