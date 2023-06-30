import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UserService } from './user.service';
import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
  getSocketFromId,
  getSockets,
  verifyToken,
  wrongtoken,
} from '../utils/socket.function';
import { FriendCode } from '../utils/requestcode.enum';
import { ChannelService } from '../channel/channel.service';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway()
export class UserGateway implements OnGatewayInit {
  @WebSocketServer() server;
  private logger: Logger = new Logger('UserGateway');

  constructor(
    private userService: UserService,
    private channelService: ChannelService,
    private authService: AuthService,
  ) {}

  afterInit() {
    this.logger.log('building in progress');
  }

  @SubscribeMessage('research_name')
  async research_name(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'research_name');
      return;
    }
    const name = payload.name;
    const user_id = client.data.id;
    this.logger.log('research_name + ' + user_id);
    const users = await this.userService.getUserBySimilarNames(name, user_id);
    client.emit('research_name', users);
  }

  @SubscribeMessage('friend_request') //reception d'une demande d'ami / accepter une demande d'ami
  async handleFriendRequest(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'friend_request');
      return;
    }
    let send;
    const friend_id = payload.friend_id;
    const user_id = client.data.id;
    this.logger.log(`new friend request from ${user_id} to ${friend_id}`);
    const user = await this.userService.getUserById(user_id);
    const friend = await this.userService.getUserById(friend_id);
    let ret;
    let friend_socket: Socket | null;
    if (friend_id == user_id) {
      return;
    }
    if (friend != null) {
      friend_socket = getSocketFromId(friend_id, getSockets(this.server));
    }
    if (friend == null) {
      ret = {
        code: FriendCode.UNEXISTING_USER,
      };
    } else if (await this.userService.isfriend(user_id, friend_id)) {
      ret = {
        code: FriendCode.ALREADY_FRIEND,
      };
    } else if (await this.userService.asfriendrequestby(user_id, friend_id)) {
      await this.userService.removeFriendRequest(user_id, friend_id);
      if (friend_socket != null) {
        send = {
          code: FriendCode.NEW_FRIEND,
          id: user_id,
          username: user.username,
        };
        friend_socket.emit('friend_notif', send);
        friend_socket.emit('friend_request', send);
      }
      await this.userService.addFriend(user_id, friend_id);
      await this.userService.addFriend(friend_id, user_id);
      const mpchannel = await this.channelService.createMPChannel(
        user_id,
        friend_id,
      );
      ret = this.channelService.getChannelById(mpchannel.id);
      client.join(mpchannel.id);
      if (friend_socket != null) friend_socket.join(mpchannel.id);
      this.server.emit('update_user_channel', ret);
      ret = {
        code: FriendCode.NEW_FRIEND,
      };
    } else {
      ret = {
        code: FriendCode.FRIEND_REQUEST_SENT,
      };
      const requestFriend = await this.userService.addFriendRequest(
        user_id,
        friend_id,
      );
      if (friend_socket != null) {
        send = {
          code: FriendCode.FRIEND_REQUEST,
          id: user.id,
          request: requestFriend.id,
          username: user.username,
        };
        friend_socket.emit('friend_notif', send);
        friend_socket.emit('friend_request', send);
      }
    }
    client.emit('friend_code', ret);
  }

  @SubscribeMessage('unfriend_request')
  async unfriend_request(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'unfriend_request');
      return;
    }
    const friend_id = payload.friend_id;
    const user_id = client.data.id;
    const friend_socket = getSocketFromId(friend_id, getSockets(this.server));
    if (await this.userService.isfriend(user_id, friend_id)) {
      await this.userService.removeFriends(user_id, friend_id);
      const mpchannel = await this.channelService.getmpchannel(
        user_id,
        friend_id,
      );
      if (mpchannel != null) {
        await this.channelService.deletechannel(mpchannel.id);
      }
      client.emit('delete_channel', { id: mpchannel.id });
      client.emit('friend_code', {
        code: FriendCode.UNFRIEND_SUCCESS,
      });
      if (friend_socket != null) {
        friend_socket.emit('delete_channel', { id: mpchannel.id });
        friend_socket.emit('friend_code', {
          code: FriendCode.NEW_UNFRIEND,
          id: user_id,
        });
      }
    } else {
      client.emit('friend_code', {
        code: FriendCode.UNEXISTING_FRIEND,
      });
    }
  }

  @SubscribeMessage('block_user')
  async block_user(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'block_user');
      return;
    }
    const user_id = client.data.id;
    const block_id = payload.block_id;
    if (block_id == null) {
      client.emit('block_code', {
        message: 'block_id is null',
        code: 1,
      });
      return;
    }
    try {
      const user = await this.userService.addBlocked(user_id, block_id);
      client.emit('block_code', {
        message: 'ok',
        code: 2,
      });
    } catch (e) {
      client.emit('block_code', {
        message: e.message,
        code: 1,
      });
      return;
    }
  }

  @SubscribeMessage('unblock_user')
  async unblock_user(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'unblock_user');
      return;
    }
    const user_id = client.data.id;
    const unblock_id = payload.unblock_id;
    if (unblock_id == null) {
      client.emit('block_code', {
        message: 'unblock_id is null',
        code: 1,
      });
      return;
    }
    try {
      const user = await this.userService.removeBlocked(user_id, unblock_id);
      client.emit('block_code', {
        message: 'reject',
        code: 3,
      });
    } catch (e) {
      client.emit('block_code', {
        message: e.message,
        code: 1,
      });
    }
  }
}
