import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChannelService } from './channel.service';
import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ChannelCode, messageCode } from '../utils/requestcode.enum';
import {
  getSocketFromId,
  getSockets,
  verifyToken,
  wrongtoken,
} from '../utils/socket.function';
import { UserService } from '../user/user.service';
import { sendMessageDTO } from '../dto/sendmessage.dto';
import { AuthService } from '../auth/auth.service';
import { JoinChannelDto } from '../dto/join-channel.dto';
import { BanUserDto } from '../dto/ban-user.dto';
import { use } from 'passport';
import { addAdminDto } from '../dto/add-admin.dto';

@WebSocketGateway()
export class ChannelGateway implements OnGatewayInit {
  @WebSocketServer() server;
  private logger: Logger = new Logger('ChannelGateway');

  constructor(
    private channelService: ChannelService,
    private userService: UserService,
    private authService: AuthService,
  ) {}

  afterInit() {
    this.logger.log('building in progress');
  }

  @SubscribeMessage('invite_channel')
  async invite_channel(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'invite_channel');
      return;
    }
    const channel_id = payload.channel_id;
    const receiver_id = payload.receiver_id;
    const sender_id = client.data.id;
    const receiver = await this.userService.getUserById(receiver_id);
    const sender = await this.userService.getUserById(sender_id);
    const channel = await this.channelService.getChannelById(channel_id);
    if (channel == null) {
      return;
    }
    if (receiver == null || sender == null) {
      client.emit('update_user_channel', {
        code: 1,
        sender_id: sender_id,
        message: 'user not found',
        channel: channel,
      });
      this.server.to(channel_id).emit('update_user_channel', {
        code: 1,
        sender_id: sender_id,
        channel: channel,
      });
      return;
    }
    if (channel == null) {
      client.emit('update_user_channel', {
        code: 1,
        sender_id: sender_id,
        message: 'channel not found',
        channel: channel,
      });
      this.server.to(channel_id).emit('update_user_channel', {
        code: 1,
        channel: channel,
        sender_id: sender_id,
      });
    } else {
      let ch = null;
      try {
        ch = await this.channelService.inviteChannel(
          sender_id,
          receiver_id,
          channel_id,
        );
      } catch (e) {
        client.emit('update_user_channel', {
          code: 1,
          channel: channel,
          sender_id: sender_id,
          message: e.message,
        });
        this.server.to(channel_id).emit('update_user_channel', {
          code: 1,
          channel: channel,
          sender_id: sender_id,
        });
        return;
      }
      if (ch != null) {
        const socket = getSocketFromId(receiver_id, getSockets(this.server));
        if (socket != null) {
          socket.join(channel_id);
          socket.emit('update_user_channel', {
            code: 0,
            channel: ch,
            sender_id: sender_id,
            message: 'ok',
          });
        }
        this.server.to(channel_id).emit('update_user_channel', {
          code: 0,
          channel: ch,
          sender_id: sender_id,
        });
      }
      return;
    }
  }
  @SubscribeMessage('send_message')
  async handleMessage(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'send_message');
      return;
    }
    if (
      payload.token == null ||
      payload.channel_id == null ||
      payload.content == null ||
      payload.channel_id.length <= 0
    ) {
      client.emit('message_code', messageCode.INVALID_FORMAT);
    }
    const channel_id = payload.channel_id;
    let message = payload.content;
    let send;
    const user_id = client.data.id;
    const user = await this.userService.getUserById(user_id);
    const channel = await this.channelService.getChannelById(channel_id);
    if (user == null) {
      send = {
        code: messageCode.UNAUTHORIZED,
      };
    } else if (channel == null) {
      send = {
        code: messageCode.UNEXISTING_CHANNEL,
      };
    } else if (!(await this.channelService.isInChannel(user.id, channel.id))) {
      send = {
        code: messageCode.UNACCESSIBLE_CHANNEL,
      };
    } else {
      message = new sendMessageDTO();
      message.content = payload.content;
      message.channel_id = payload.channel_id;
      let msg;
      try {
        msg = await this.channelService.sendMessage(message, user.id);
      } catch (error) {
        send = {
          code: messageCode.INVALID_FORMAT,
          message: error.message,
        };
        client.emit('message_code', send);
        return;
      }
      send = {
        code: messageCode.SUCCESS,
      };
      const sendmsg = {
        id: msg.id,
        content: msg.content,
        user: msg.user,
        channel: msg.channel,
        date: msg.date,
      };
      const chan = await this.channelService.getChannelById(channel_id);
      for (const User of chan.users) {
        const socket = getSocketFromId(User.id, getSockets(this.server));
        if (
          socket != null &&
          !(await this.userService.isBlocked(User.id, user_id))
        ) {
          if (socket.data.id != user_id) socket.emit('notif_message', sendmsg);
          socket.emit('message', sendmsg);
        }
      }
    }
    client.emit('message_code', send);
  }

  @SubscribeMessage('join_channel')
  async handleJoinChannel(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'join_channel');
      return;
    }
    const channel_id = payload.channel_id;
    const user_id = client.data.id;
    const user = await this.userService.getUserById(user_id);
    const channel = await this.channelService.getChannelById(channel_id);
    const send = {
      code: 0,
      channel: channel,
      sender_id: user_id,
      message: undefined,
    };
    if (channel == null) {
      send.code = 1;
      send.message = 'Channel does not exist';
    } else if (!(await this.channelService.isInChannel(user.id, channel.id))) {
      let ch;
      const ChannelDTO = new JoinChannelDto();
      ChannelDTO.channel_id = channel_id;
      ChannelDTO.user_id = user_id;
      if (payload.password != null) {
        ChannelDTO.password = payload.password;
      }
      try {
        ch = await this.channelService.joinChannel(ChannelDTO);
        client.join(channel_id);
        send.channel = ch;
        client.emit('update_user_channel', send);
        send.message = undefined;
        this.server.to(channel_id).emit('update_user_channel', send);
        return;
      } catch (e) {
        send.code = 1;
        send.message = e.message;
        client.emit('update_user_channel', send);
        send.message = undefined;
        this.server.to(channel_id).emit('update_user_channel', send);
        return;
      }
    } else {
      client.join(channel_id);
      send.message = 'joined';
      client.emit('update_user_channel', send);
    }
  }

  @SubscribeMessage('leave_channel')
  async handleLeaveChannel(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'leave_channel');
      return;
    }
    const channel_id = payload.channel_id;
    const channel = await this.channelService.getChannelById(channel_id);
    const user_id = client.data.id;
    const send = {
      code: 0,
      channel: channel,
      sender_id: user_id,
      message: undefined,
    };
    if (user_id == null) {
      send.code = 1;
      this.server.to(channel_id).emit('update_user_channel', send);
      send.message = 'User does not exist';
      client.emit('update_user_channel', send);
      return;
    }
    const user = await this.userService.getUserById(user_id);
    if (channel == null) {
      send.code = 1;
      this.server.to(channel_id).emit('update_user_channel', send);
      send.message = 'Channel does not exist';
      client.emit('update_user_channel', send);
      return;
    } else if (!(await this.channelService.isInChannel(user_id, channel.id))) {
      send.code = 1;
      this.server.to(channel_id).emit('update_user_channel', send);
      send.message = 'User is not in channel';
      client.emit('update_user_channel', send);
      return;
    } else {
      if (channel.creator.id == user_id) {
        this.server.to(channel_id).emit('delete_channel', { id: channel_id });
        for (const User of channel.users) {
          const socket = getSocketFromId(User.id, getSockets(this.server));
          if (socket != null) {
            socket.emit('delete_channel', { id: channel_id });
            socket.leave(channel_id);
          }
        }
        await this.channelService.deletechannel(channel_id);
        return;
      }
      send.channel = await this.channelService.leaveChannel(
        user_id,
        channel.id,
      );
      this.server.to(channel_id).emit('update_user_channel', send);
      send.message = 'ok';
      client.emit('delete_channel', { id: channel_id });
    }
  }

  @SubscribeMessage('kick_user')
  async kick_user(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'ban_user');
      return;
    }
    const user_id = client.data.id;
    const channel_id = payload.channel_id;
    const kick_id = payload.kick_id;
    const addBan = new BanUserDto();
    const channel = await this.channelService.getChannelById(channel_id);
    addBan.channel_id = channel_id;
    addBan.user_id = kick_id;
    try {
      const chan = await this.channelService.kickUser(addBan, user_id);
      if (chan != null) {
        const socket: Socket = getSocketFromId(
          kick_id,
          getSockets(this.server),
        );
        if (socket != null) {
          socket.leave(channel_id);
          socket.emit('delete_channel', { id: channel_id });
        }
        this.server.to(channel_id).emit('update_user_channel', {
          channel: chan,
          sender_id: user_id,
          code: 0,
        });
        client.emit('update_user_channel', {
          channel: chan,
          sender_id: user_id,
          code: 0,
          message: 'ok',
        });
      }
    } catch (e) {
      this.server.to(channel_id).emit('update_user_channel', {
        channel: channel,
        sender_id: user_id,
        code: 1,
      });
      client.emit('update_user_channel', {
        channel: channel,
        sender_id: user_id,
        code: 1,
        message: e.message,
      });
    }
  }

  @SubscribeMessage('ban_user')
  async ban_user(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'ban_user');
      return;
    }
    const user_id = client.data.id;
    const channel_id = payload.channel_id;
    const ban_id = payload.ban_id;
    const addBan = new BanUserDto();
    const channel = await this.channelService.getChannelById(channel_id);
    addBan.channel_id = channel_id;
    addBan.user_id = ban_id;
    try {
      const chan = await this.channelService.banUser(addBan, user_id);
      if (chan != null) {
        const socket: Socket = getSocketFromId(ban_id, getSockets(this.server));
        if (socket != null) {
          socket.leave(channel_id);
          socket.emit('delete_channel', { id: channel_id });
        }
        this.server.to(channel_id).emit('update_user_channel', {
          channel: chan,
          sender_id: user_id,
          code: 0,
        });
        client.emit('update_user_channel', {
          channel: chan,
          sender_id: user_id,
          code: 0,
          message: 'ok',
        });
      }
    } catch (e) {
      this.server.to(channel.id).emit('update_user_channel', {
        channel: channel,
        sender_id: user_id,
        code: 1,
      });
      client.emit('update_user_channel', {
        channel: channel,
        sender_id: user_id,
        code: 1,
        message: e.message,
      });
    }
  }

  @SubscribeMessage('unban_user')
  async unban_user(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'unban_user');
      return;
    }
    const user_id = client.data.id;
    const channel_id = payload.channel_id;
    const ban_id = payload.unban_id;
    const addBan = new BanUserDto();
    const channel = await this.channelService.getChannelById(channel_id);
    addBan.channel_id = channel_id;
    addBan.user_id = ban_id;
    try {
      const chan = await this.channelService.deleteBanUser(addBan, user_id);
      if (chan != null) {
        this.server.to(chan.id).emit('update_user_channel', {
          channel: chan,
          sender_id: user_id,
          code: 0,
        });
        client.emit('update_user_channel', {
          channel: chan,
          sender_id: user_id,
          code: 0,
          message: 'ok',
        });
      }
    } catch (e) {
      this.server.to(channel.id).emit('update_user_channel', {
        channel: channel,
        sender_id: user_id,
        code: 1,
      });
      client.emit('update_user_channel', {
        channel: channel,
        sender_id: user_id,
        code: 1,
        message: e.message,
      });
    }
  }

  @SubscribeMessage('add_admin')
  async add_admin(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'add_admin');
      return;
    }
    const user_id = client.data.id;
    const channel_id = payload.channel_id;
    const channel = await this.channelService.getChannelById(channel_id);
    const admin_id = payload.admin_id;
    const addAdmin = new addAdminDto();
    addAdmin.channel_id = channel_id;
    addAdmin.user_id = admin_id;
    try {
      const chan = await this.channelService.addAdmin(addAdmin, user_id);
      if (chan != null) {
        this.server.to(channel_id).emit('update_user_channel', {
          channel: chan,
          code: 0,
          sender_id: user_id,
        });
        client.emit('update_user_channel', {
          channel: chan,
          code: 0,
          sender_id: user_id,
          message: 'ok',
        });
      }
    } catch (e) {
      this.server.to(channel_id).emit('update_user_channel', {
        channel: channel,
        code: 1,
        sender_id: user_id,
      });
      client.emit('update_user_channel', {
        channel: channel,
        code: 1,
        sender_id: user_id,
        message: e.message,
      });
    }
  }

  @SubscribeMessage('remove_admin')
  async remove_admin(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'remove_admin');
      return;
    }
    const user_id = client.data.id;
    const channel_id = payload.channel_id;
    const channel = await this.channelService.getChannelById(channel_id);
    const admin_id = payload.admin_id;
    const addAdmin = new addAdminDto();
    addAdmin.channel_id = channel_id;
    addAdmin.user_id = admin_id;
    try {
      const chan = await this.channelService.deleteAdmin(addAdmin, user_id);
      if (chan != null) {
        this.server.to(chan.id).emit('update_user_channel', {
          channel: chan,
          code: 0,
          sender_id: user_id,
        });
        client.emit('update_user_channel', {
          channel: chan,
          code: 0,
          sender_id: user_id,
          message: 'ok',
        });
      }
    } catch (e) {
      this.server.to(channel_id).emit('update_user_channel', {
        channel: channel,
        code: 1,
        sender_id: user_id,
      });
      client.emit('update_user_channel', {
        channel: channel,
        code: 1,
        sender_id: user_id,
        message: e.message,
      });
    }
  }

  @SubscribeMessage('research_channel')
  async research_channel(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'research_channel');
      return;
    }
    const ch = await this.channelService.researchAvailableChannels(
      client.data.id,
      payload.search,
    );
    client.emit('research_channel', { channels: ch });
  }

  @SubscribeMessage('add_muted')
  async add_muted(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'add_muted');
      return;
    }
    const user_id = client.data.id;
    const channel_id = payload.channel_id;
    const muted_id = payload.mute_id;
    let chan;
    try {
      chan = await this.channelService.addMutedUser(
        muted_id,
        user_id,
        channel_id,
      );
      client.emit('update_user_channel', {
        channel: chan,
        code: 0,
        sender_id: user_id,
        message: 'ok',
      });
      this.server.to(chan.id).emit('update_user_channel', {
        channel: chan,
        code: 0,
        sender_id: user_id,
      });
    } catch (e) {
      chan = await this.channelService.getChannelById(channel_id);
      client.emit('update_user_channel', {
        channel: chan,
        code: 1,
        sender_id: user_id,
        message: e.message,
      });
      this.server.to(chan.id).emit('update_user_channel', {
        channel: chan,
        code: 1,
        sender_id: user_id,
      });
    }
  }

  @SubscribeMessage('remove_muted')
  async remove_muted(client: Socket, payload: any) {
    if (
      payload.token == null ||
      !verifyToken(payload.token, this.authService)
    ) {
      wrongtoken(client, 'remove_muted');
      return;
    }
    const user_id = client.data.id;
    const channel_id = payload.channel_id;
    const muted_id = payload.mute_id;
    let chan;
    try {
      chan = await this.channelService.removeMutedUser(
        muted_id,
        user_id,
        channel_id,
      );
      console.log(chan);
      client.emit('update_user_channel', {
        channel: chan,
        code: 0,
        sender_id: user_id,
        message: 'ok',
      });
      this.server.to(chan.id).emit('update_user_channel', {
        channel: chan,
        code: 0,
        sender_id: user_id,
      });
    } catch (e) {
      chan = await this.channelService.getChannelById(channel_id);
      client.emit('update_user_channel', {
        channel: chan,
        code: 1,
        sender_id: user_id,
        message: e.message,
      });
      this.server.to(chan.id).emit('update_user_channel', {
        channel: chan,
        code: 1,
        sender_id: user_id,
      });
    }
  }
}
