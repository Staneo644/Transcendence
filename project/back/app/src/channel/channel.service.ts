import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addAdminDto } from 'src/dto/add-admin.dto';
import { CreateChannelDto } from 'src/dto/create-channel.dto';
import { JoinChannelDto } from 'src/dto/join-channel.dto';
import { sendMessageDTO } from 'src/dto/sendmessage.dto';
import { UserService } from 'src/user/user.service';
import { Like, Repository } from 'typeorm';
import { Channel } from './channel.entity';
import { Message } from './message.entity';
import { ChannelType } from 'src/utils/channel.enum';
import { BanUserDto } from '../dto/ban-user.dto';
import * as bcrypt from 'bcrypt';
import {
  getSocketFromId,
  getSockets,
  includeUser,
} from '../utils/socket.function';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Mute } from './mute.entity';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChannelService {
  @WebSocketServer() server: Server;
  constructor(
    @InjectRepository(Mute) private muteRepository: Repository<Mute>,
    @InjectRepository(Channel) private channelRepository: Repository<Channel>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    private readonly userService: UserService,
  ) {
    setInterval(async () => {
      const mutes = await this.muteRepository
        .createQueryBuilder('mute')
        .leftJoinAndSelect('mute.mutedUser', 'mutedUser')
        .leftJoinAndSelect('mute.mutedChannel', 'mutedChannel')
        .getMany();
      for (const mute of mutes) {
        if (mute.date < new Date()) {
          await this.muteRepository.delete(mute);
          this.server.to(mute.mutedChannel.id).emit('update_user_channel', {
            code: 0,
            channel: mute.mutedChannel,
            sender_id: mute.mutedUser.id,
            message: 'ok',
          });
        }
      }
    }, 60000);
  }

  public async createChannel(body: CreateChannelDto) {
    const chan = new Channel();
    if (body.name.length > 20)
      throw new Error('Channel name must be less than 12 characters');
    chan.name = body.name;
    chan.admins = [];
    chan.bannedUsers = [];
    chan.users = [];
    chan.type = body.type;
    const user = await this.userService.getUserById(body.creator_id);
    if (user == null) throw new Error('User not found');
    chan.creator = user;
    chan.users.push(user);
    chan.admins.push(user);
    if (body.type == ChannelType.PROTECTED_CHANNEL) {
      if (body.password == null)
        throw new Error('Password is required for PROTECTED_CHANNEL');
      try {
        chan.pwd = await bcrypt.hash(body.password, 10);
      } catch (err) {
        throw new Error('Can not hash password');
      }
    }
    const ret = await this.channelRepository.save(chan);
    this.server.emit('new_channel', ret);
    return chan;
  }

  public async getMutedUsers(channel_id) {
    const chan = await this.getChannelById(channel_id);
    const ret = [];
    for (const Mute of chan.mutedUsers) {
      ret.push(Mute.mutedUser);
    }
    return ret;
  }

  public async createMPChannel(user_id, user_id1) {
    const channels = await this.channelRepository.find();
    for (const chan of channels) {
      if (chan.type == ChannelType.MP_CHANNEL) {
        if (
          chan.name == user_id + ' - ' + user_id1 ||
          chan.name == user_id1 + ' - ' + user_id
        )
          throw new Error('Channel already exists');
      }
    }
    const chan = new Channel();
    chan.name = user_id + ' - ' + user_id1;
    chan.admins = [];
    chan.bannedUsers = [];
    chan.users = [];
    chan.type = ChannelType.MP_CHANNEL;
    const user = await this.userService.getUserById(user_id);
    const user1 = await this.userService.getUserById(user_id1);
    const socket_user1 = getSocketFromId(user.id, getSockets(this.server));
    const socket_user2 = getSocketFromId(user1.id, getSockets(this.server));
    chan.users.push(user);
    chan.users.push(user1);
    const ret = await this.channelRepository.save(chan);
    socket_user1.emit('join_channel', { channel_id: ret.id });
    socket_user2.emit('join_channel', { channel_id: ret.id });
    return ret;
  }

  public async getChannelById(id) {
    if (id == '') return null;
    return await this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.admins', 'admins')
      .leftJoinAndSelect('channel.bannedUsers', 'bannedUsers')
      .leftJoinAndSelect('channel.creator', 'creator')
      .leftJoinAndSelect('channel.users', 'users')
      .leftJoinAndSelect('channel.mutedUsers', 'mutedUsers')
      .leftJoinAndSelect('mutedUsers.mutedUser', 'mutedUser')
      .where('channel.id = :id', { id: id })
      .getOne();
  }

  public async isInChannel(user_id: string, channel_id: string) {
    const chan = await this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.users', 'users')
      .where('channel.id = :id', { id: channel_id })
      .getOne();
    if (chan == null) return false;
    const user = await this.userService.getUserById(user_id);
    if (user == null) return false;
    let chanuser;
    for (chanuser of chan.users) {
      if (user.id == chanuser.id) return true;
    }
    return chan.users.includes(user);
  }

  public async joinChannel(body: JoinChannelDto) {
    let chan = await this.getChannelById(body.channel_id);
    if (chan == null) throw new Error('Channel not found');
    const user = await this.userService.getUserById(body.user_id);
    if (user == null) throw new Error('User not found');
    if (chan.type == ChannelType.PROTECTED_CHANNEL) {
      if (body.password == null)
        throw new Error('Password is required for PROTECTED_CHANNEL');
      let isvalid = false;
      try {
        isvalid = await bcrypt.compare(body.password, chan.pwd);
      } catch (err) {
        throw new Error('Can not verify password');
      }
      if (isvalid == false)
        throw new Error('Password is not valid for this channel');
    }
    if (includeUser(user, chan.bannedUsers))
      throw new Error('User is banned from this channel');
    chan.users.push(user);
    chan = await this.channelRepository.save(chan);
    return chan;
  }

  public async leaveChannel(user_id, channel_id) {
    const chan = await this.getChannelById(channel_id);
    if (chan == null) throw new Error('Channel not found');
    const user = await this.userService.getUserById(user_id);
    if (user == null) throw new Error('User not found');
    if (!includeUser(user, chan.users)) throw new Error('User not in channel');
    chan.users = chan.users.filter((u) => u.id != user.id);
    return await this.channelRepository.save(chan);
  }

  public async addAdmin(body: addAdminDto, user_id) {
    const target = await this.userService.getUserById(body.user_id);
    const user = await this.userService.getUserById(user_id);
    if (user == null || target == null) throw new Error('User not found');
    let chan = await this.getChannelById(body.channel_id);
    if (chan == null) throw new Error('Channel not found');
    let f = false;
    for (const admin of chan.admins) {
      if (admin.id == user.id) f = true;
    }
    if (user.id == chan.creator.id) f = true;
    if (!f) throw new Error('User is not admin of this channel');
    for (const admin of chan.admins) {
      if (admin.id == target.id)
        throw new Error('Target is already admin of this channel');
    }
    f = false;
    for (const user of chan.users) {
      if (user.id == target.id) f = true;
    }
    if (!f) throw new Error('Target is not in this channel');
    chan.admins.push(target);
    chan = await this.channelRepository.save(chan);
    return chan;
  }

  public async kickUser(body: BanUserDto, user_id) {
    const target = await this.userService.getUserById(body.user_id);
    const user = await this.userService.getUserById(user_id);

    if (user == null || target == null) throw new Error('User not found');
    const chan = await this.getChannelById(body.channel_id);
    if (chan == null) throw new Error('Channel not found');
    if (user.id != chan.creator.id) {
      if (!includeUser(user, chan.admins))
        throw new Error('User is not admin of this channel');
    }
    if (!includeUser(target, chan.users))
      throw new Error('User is not in this channel');
    if (includeUser(target, chan.admins) || chan.creator.id == target.id)
      throw new Error('User is admin of this channel');
    const ret = [];
    for (const u of chan.users) {
      if (u.id != target.id) ret.push(u);
    }
    chan.users = ret;
    return await this.channelRepository.save(chan);
  }

  public async banUser(body: BanUserDto, user_id) {
    const target = await this.userService.getUserById(body.user_id);
    const user = await this.userService.getUserById(user_id);
    if (user == null || target == null) throw new Error('User not found');
    const chan = await this.getChannelById(body.channel_id);
    if (chan == null) throw new Error('Channel not found');
    if (user.id != chan.creator.id) {
      if (!includeUser(user, chan.admins))
        throw new Error('User is not admin of this channel');
    }
    if (!includeUser(target, chan.users))
      throw new Error('User is not in this channel');
    if (includeUser(target, chan.admins) || chan.creator.id == target.id)
      throw new Error('User is admin of this channel');
    chan.bannedUsers.push(target);
    const ret = [];
    for (const u of chan.users) {
      if (u.id != target.id) ret.push(u);
    }
    chan.users = ret;
    return await this.channelRepository.save(chan);
  }

  public async getMessage(channel_id, user_id) {
    if (user_id == null) {
      const chan = await this.channelRepository
        .createQueryBuilder('channel')
        .leftJoinAndSelect('channel.messages', 'messages')
        .leftJoinAndSelect('messages.user', 'user')
        .leftJoinAndSelect('channel.users', 'users')
        .where('channel.id = :id', { id: channel_id })
        .getOne();
      if (chan == null) throw new Error('Channel not found');
      if (chan.messages == null || chan.messages.length == 0) return null;
      return chan.messages;
    }
    const user = await this.userService.getUserById(user_id);
    if (user == null) throw new Error('User not found');
    const chan = await this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.messages', 'messages')
      .leftJoinAndSelect('messages.user', 'user')
      .leftJoinAndSelect('channel.users', 'users')
      .where('channel.id = :id', { id: channel_id })
      .getOne();
    if (chan == null) throw new Error('Channel not found');
    let f = false;
    for (const u of chan.users) {
      if (u.id == user.id) f = true;
    }
    if (!f) throw new Error('User not in channel');
    if (chan.messages == null || chan.messages.length == 0) return null;
    const ret = [];
    for (const message of chan.messages) {
      if ((await this.userService.isBlocked(user.id, message.user.id)) == false)
        ret.push(message);
    }
    return ret;
  }

  public async sendMessage(body: sendMessageDTO, user_id) {
    if (body.content.length > 4242 || body.content.length <= 0)
      throw new Error('Message too long (max 4242) or empty');
    const message = new Message();
    message.content = body.content;
    message.date = new Date();
    const user = await this.userService.getUserById(user_id);
    if (user == null) throw new Error('User not found');
    const channel = await this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.messages', 'messages')
      .leftJoinAndSelect('channel.users', 'users')
      .leftJoinAndSelect('channel.mutedUsers', 'mutedUsers')
      .leftJoinAndSelect('mutedUsers.mutedUser', 'mutedUser')
      .where('channel.id = :id', { id: body.channel_id })
      .getOne();
    if (channel == null) throw new Error('Channel not found');
    if (includeUser(user, await this.getMutedUsers(channel.id)))
      throw new Error('User is muted');
    message.channel = channel;
    message.user = user;
    if (channel.messages == null) channel.messages = [];
    channel.messages.push(message);
    await this.channelRepository.save(channel);
    const ret: any = await this.messageRepository.save(message);
    ret.channel = await this.getChannelById(body.channel_id);
    return ret;
  }

  async getChannelsByName(name: string) {
    return await this.channelRepository.find({
      where: { name: Like(`%${name}%`) },
    });
  }

  async getAccessibleChannels(user_id: string) {
    const user = await this.userService.getUserById(user_id);
    if (user == null) throw new Error('User not found');
    const channels = await this.channelRepository.find();
    let channel;
    for (channel of channels) {
      if (!channel.users.includes(user))
        channels.filter((c) => c.id != channel.id);
    }
    return channels;
  }

  async researchAvailableChannels(id: string, name: string) {
    if (name == null || name == '') {
      return await this.getAvailableChannels(id);
    }
    const user = await this.userService.getUserById(id);
    if (user == null) throw new Error('User not found');
    const channels = await this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.admins', 'admins')
      .leftJoinAndSelect('channel.bannedUsers', 'bannedUsers')
      .leftJoinAndSelect('channel.creator', 'creator')
      .leftJoinAndSelect('channel.users', 'users')
      .leftJoinAndSelect('channel.mutedUsers', 'mutedUsers')
      .leftJoinAndSelect('mutedUsers.mutedUser', 'mutedUser')
      .where('channel.name LIKE :name', { name: `%${name}%` })
      .getMany();
    const chan = [];
    if (channels == null) return null;
    for (const c of channels) {
      if (
        c.type != ChannelType.PRIVATE_CHANNEL &&
        c.type != ChannelType.MP_CHANNEL &&
        !includeUser(user, c.bannedUsers) &&
        !includeUser(user, c.users)
      )
        chan.push(c);
    }
    if (chan.length == 0) return null;
    return chan;
  }

  async getAvailableChannels(id: string) {
    const user = await this.userService.getUserById(id);
    if (user == null) throw new Error('User not found');
    const channels = await this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.admins', 'admins')
      .leftJoinAndSelect('channel.bannedUsers', 'bannedUsers')
      .leftJoinAndSelect('channel.creator', 'creator')
      .leftJoinAndSelect('channel.users', 'users')
      .leftJoinAndSelect('channel.mutedUsers', 'mutedUsers')
      .leftJoinAndSelect('mutedUsers.mutedUser', 'mutedUser')
      .getMany();
    const chan = [];
    if (channels == null) return null;
    for (const c of channels) {
      if (
        c.type != ChannelType.PRIVATE_CHANNEL &&
        c.type != ChannelType.MP_CHANNEL &&
        !includeUser(user, c.bannedUsers) &&
        !includeUser(user, c.users)
      )
        chan.push(c);
    }
    if (chan.length == 0) return null;
    return chan;
  }

  async getAdmin(body: addAdminDto, id: string) {
    const channel = await this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.admins', 'admins')
      .where('channel.id = :id', { id: body.channel_id })
      .getOne();
    if (channel == null) throw new Error('Channel not found');
    const user = await this.userService.getUserById(id);
    if (user == null) throw new Error('User not found');
    if (!channel.users.includes(user))
      throw new Error('User is not in this channel');
    return channel.admins;
  }

  async deleteAdmin(body: addAdminDto, id: string) {
    const self_user = await this.userService.getUserById(id);
    if (self_user == null) throw new Error('User not found');
    const target = await this.userService.getUserById(body.user_id);
    if (target == null) throw new Error('User not found');
    const channel = await this.getChannelById(body.channel_id);
    if (channel == null) throw new Error('Channel not found');
    let f = false;
    for (const admin of channel.admins) {
      if (admin.id == self_user.id) f = true;
    }
    if (!f) throw new Error('User is not admin of this channel');
    f = false;
    for (const admin of channel.admins) {
      if (admin.id == target.id) f = true;
    }
    if (target.id == channel.creator.id)
      throw new Error('Cannot remove creator');
    if (!f) throw new Error('Target is not admin of this channel');
    const admins = [];
    for (const admin of channel.admins) {
      if (admin.id != target.id) admins.push(admin);
    }
    channel.admins = admins;
    return await this.channelRepository.save(channel);
  }

  async getBanUser(channel_id, user_id) {
    const user = await this.userService.getUserById(user_id);
    if (user == null) throw new Error('User not found');
    const channel = await this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.bannedUsers', 'bannedUsers')
      .where('channel.id = :id', { id: channel_id })
      .getOne();
    if (channel == null) throw new Error('Channel not found');
    if (!channel.users.includes(user))
      throw new Error('User is not in this channel');
    if (!channel.admins.includes(user))
      throw new Error('User is not admin of this channel');
    return channel.bannedUsers;
  }

  async deleteBanUser(body: BanUserDto, id: string) {
    const self_user = await this.userService.getUserById(id);
    if (self_user == null) throw new Error('User not found');
    const target = await this.userService.getUserById(body.user_id);
    if (target == null) throw new Error('User not found');
    const channel = await this.getChannelById(body.channel_id);
    if (channel == null) throw new Error('Channel not found');
    if (!includeUser(self_user, channel.users))
      throw new Error('User is not in this channel');
    if (!includeUser(self_user, channel.admins))
      throw new Error('User is not admin of this channel');
    if (!includeUser(target, channel.bannedUsers))
      throw new Error('User is not banned of this channel');
    const bannedUsers = [];
    for (const bannedUser of channel.bannedUsers) {
      if (bannedUser.id != target.id) bannedUsers.push(bannedUser);
    }
    channel.bannedUsers = bannedUsers;
    return await this.channelRepository.save(channel);
  }

  async getmpchannel(user_id: any, friend_id: any) {
    const friend = await this.userService.getUserById(friend_id);
    const c = await this.userService.getMpChannels(user_id);
    const channelmps = [];
    if (c == null) return null;
    for (const channel of c) {
      channelmps.push(
        await this.channelRepository
          .createQueryBuilder('channel')
          .leftJoinAndSelect('channel.users', 'users')
          .where('channel.id = :id', { id: channel.id })
          .getOne(),
      );
    }
    let ret = null;
    for (const channel of channelmps) {
      for (const user of channel.users) {
        if (user.id == friend.id) ret = channel;
      }
    }
    return ret;
  }

  async deletechannel(id) {
    const channel = await this.channelRepository.findOneBy({ id: id });
    if (channel == null) throw new Error('Channel not found');
    const messages = await this.getMessage(channel.id, null);
    if (messages != null && messages.length > 0) {
      for (const message of messages) {
        await this.messageRepository.delete(message);
      }
    }
    return await this.channelRepository.delete(id);
  }

  async inviteChannel(sender_id: any, receiver_id: any, channel_id: any) {
    const channel = await this.getChannelById(channel_id);
    if (channel.type == ChannelType.MP_CHANNEL)
      throw new Error('Channel is private');

    let f = false;
    for (const user of channel.admins) {
      if (user.id == sender_id) {
        f = true;
      }
    }
    if (!f) throw new Error('User is not admin of this channel');
    const user = await this.userService.getUserById(receiver_id);
    if (user == null) throw new Error('User not found');
    for (const u of channel.users) {
      if (u.id == user.id) throw new Error('User already in this channel');
    }
    if (includeUser(user, channel.bannedUsers))
      throw new Error('User is banned of this channel');
    channel.users.push(user);
    return await this.channelRepository.save(channel);
  }

  async updateChannel(channel_id: any, user_id: any, body: any) {
    const channel = await this.channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.admins', 'admins')
      .leftJoinAndSelect('channel.creator', 'creator')
      .where('channel.id = :id', { id: channel_id })
      .getOne();
    if (channel == null) throw new Error('Channel not found');
    if (channel.creator.id == user_id) {
      if (channel.pwd == null && body.password != '') {
        channel.type = ChannelType.PROTECTED_CHANNEL;
        channel.pwd = await bcrypt.hash(body.password, 10);
        return await this.channelRepository.save(channel);
      }
      if (body.password != '') {
        if ((await bcrypt.compare(body.old_password, channel.pwd)) == false)
          throw new Error('Wrong password');
        channel.pwd = await bcrypt.hash(body.password, 10);
      }
      if (body.name.length < 20) {
        if (body.name.length > 0) channel.name = body.name;
      } else throw new Error('Name is too long');
      const ret = await this.channelRepository.save(channel);
      this.server.to(channel_id).emit('update_channel', {
        code: 0,
        channel_id: channel_id,
        name: ret.name,
        type: ret.type,
      });
      return { channel_id: ret.id, name: ret.name };
    } else {
      for (const admin of channel.admins) {
        if (admin.id == user_id) {
          if (body.name != null) channel.name = body.name;
          const ret = await this.channelRepository.save(channel);
          this.server.to(channel_id).emit('update_channel', {
            code: 0,
            channel_id: channel_id,
            name: ret.name,
            type: ret.type,
          });
          return { channel_id: ret.id, name: ret.name };
        }
      }
    }
    throw new Error('User is not admin of this channel');
  }

  async addMutedUser(target_id: string, user_id: string, channel_id: string) {
    const target = await this.userService.getUserById(target_id);
    if (target == null) throw new Error('User not found');
    const user = await this.userService.getUserById(user_id);
    if (user == null) throw new Error('User not found');
    const channel = await this.getChannelById(channel_id);
    if (channel == null) throw new Error('Channel not found');
    if (!includeUser(user, channel.admins))
      throw new Error('User is not admin of this channel');
    if (includeUser(target, await this.getMutedUsers(channel.id)))
      throw new Error('User is already muted of this channel');
    try {
      const mute: Mute = new Mute();
      mute.mutedUser = target;
      mute.date = new Date();
      mute.date.setHours(mute.date.getHours() + 1);
      channel.mutedUsers.push(mute);
      await this.muteRepository.save(mute);
      await this.channelRepository.save(channel);

      return await this.getChannelById(channel_id);
    } catch (error) {
      console.error('Error saving Mute:', error.message);
      throw error;
    }
  }

  async removeMutedUser(
    target_id: string,
    user_id: string,
    channel_id: string,
  ) {
    const target = await this.userService.getUserById(target_id);
    if (target == null) throw new Error('User not found');
    const user = await this.userService.getUserById(user_id);
    if (user == null) throw new Error('User not found');
    const channel = await this.getChannelById(channel_id);
    if (channel == null) throw new Error('Channel not found');
    if (!includeUser(user, channel.admins))
      throw new Error('User is not admin of this channel');
    if (!includeUser(target, await this.getMutedUsers(channel.id)))
      throw new Error('User is not muted of this channel');
    const mutedUsers = [];
    for (const mutedUser of channel.mutedUsers) {
      if (mutedUser.mutedUser.id != target.id) mutedUsers.push(mutedUser);
      else await this.muteRepository.delete(mutedUser);
    }
    channel.mutedUsers = mutedUsers;
     await this.channelRepository.save(channel);
    return await this.getChannelById(channel_id);
  }
}
