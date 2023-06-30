import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthService } from '../auth/auth.service';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import fetch from 'node-fetch';
import { RequestFriend } from './requestfriend.entity';
import { ChannelType } from 'src/utils/channel.enum';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '../utils/user.enum';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { includeUser } from '../utils/socket.function';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class UserService {
  @WebSocketServer() private server: Server;

  constructor(
    private jwt: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(RequestFriend)
    private requestsRepository: Repository<RequestFriend>,
    private authService: AuthService,
  ) {}

  public async getPathImage(id: string) {
    const fs = require('fs');
    const path = require('path');
    const imageDir = path.join(__dirname, '..', '..', '..', 'images');
    const files = await fs.promises.readdir(imageDir);
    const matchingFiles = files.filter((file) => file.startsWith(id));
    if (matchingFiles.length == 0) {
      return null;
    }
    return path.join(imageDir, matchingFiles[0]);
  }

  public async asfriendrequestby(user_id: string, friend_id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.requests', 'requests')
      .leftJoinAndSelect('user.requestsReceived', 'requestsReceived')
      .where('user.id = :id', { id: user_id })
      .getOne();
    const friend = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.requests', 'requests')
      .leftJoinAndSelect('user.requestsReceived', 'requestsReceived')
      .where('user.id = :id', { id: friend_id })
      .getOne();
    if (user.requestsReceived == null) {
      return false;
    }
    for (let i = 0; i < user.requestsReceived.length; i++) {
      const request = await this.requestsRepository
        .createQueryBuilder('request')
        .leftJoinAndSelect('request.sender', 'sender')
        .leftJoinAndSelect('request.receiver', 'receiver')
        .where('request.id = :id', { id: user.requestsReceived[i].id })
        .getOne();
      if (request.sender.id == friend.id) {
        return true;
      }
    }
    return false;
  }

  public async isfriend(user_id: string, friend_id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.friends', 'friends')
      .where('user.id = :id', { id: user_id })
      .getOne();

    const friend = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.friends', 'friends')
      .where('user.id = :id', { id: friend_id })
      .getOne();
    if (user == null || friend == null) {
      return false;
    }
    if (user.friends == null) {
      return false;
    }
    for (let i = 0; i < user.friends.length; i++) {
      if (user.friends[i].id == friend.id) {
        return true;
      }
    }
    return false;
  }

  public async createUsers(code) {
    const retIntra = await this.authService.getIntraToken(code);
    if (retIntra == null) {
      return null;
    }
    const retUser = await this.authService.getUserIntra(retIntra.access_token);
    if (retUser == null) {
      return null;
    }
    const verif_user = await this.userRepository.findOneBy({ id: retUser.id });
    if (verif_user != null) {
      return await this.changeStatus(verif_user.id, UserStatus.IN_CONNECTION);
    }
    let login = retUser.login;
    let nbr = 0;
    while (await this.userRepository.findOneBy({ username: login })) {
      login = retUser.login + nbr;
      nbr++;
    }
    const fs = require('fs');
    const user = new User();
    user.status = UserStatus.IN_CONNECTION;
    user.id = retUser.id;
    user.username = login;
    user.email = retUser.email;
    const avatar_url = retUser.image.link;
    const request = await fetch(avatar_url);
    const buffer = await request.buffer();
    fs.mkdirSync(__dirname + '/../../../images', { recursive: true });
    const image = await this.setAvatar(user.id, buffer, '.jpg');
    if (image == null) {
      return null;
    }
    if ((await this.userRepository.findOneBy({ id: user.id })) != null) {
      return user;
    }
    const ret = await this.userRepository.save(user);
    this.server.emit('new_user', ret);
    return ret;
  }

  public async getUsers() {
    return await this.userRepository.find();
  }

  public async getUserById(id: string, withsecret = false) {
    if (withsecret) {
      const userWithSecret = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.email',
          'user.username',
          'user.experience',
          'user.secret2FA',
          'user.status',
          'user.enabled2FA',
        ])
        .where('user.id = :id', { id: id })
        .getOne();
      return userWithSecret;
    }

    return await this.userRepository.findOneBy({ id: id });
  }

  public async getImageById(id: string) {
    const imagePath = await this.getPathImage(id);
    if (imagePath == null) {
      throw new Error('Image not found');
    }
    return imagePath;
  }

  public async addFriend(id: string, friend_id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.friends', 'friends')
      .where('user.id = :id', { id })
      .getOne();
    const friend = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.friends', 'friends')
      .where('user.id = :id', { id: friend_id })
      .getOne();
    await this.removeBlocked(id, friend_id);
    await this.removeBlocked(friend_id, id);
    if (user == null || friend == null) {
      throw new Error('User not found');
    }
    if (user == friend) {
      throw new Error('Cannot add yourself as a friend');
    }
    if (!user.friends) {
      user.friends = [];
    }
    user.friends.push(friend);
    return await this.userRepository.save(user);
  }

  public async getFriends(id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.friends', 'friends')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      return null;
    }

    return user.friends;
  }

  public async test() {
    if ((await this.userRepository.findOneBy({ id: '1' })) != null) {
      return await this.userRepository.findOneBy({ id: '1' });
    }
    const user = new User();
    user.id = '1';
    user.username = 'test';
    user.email = 'test@student.42lyon.fr';
    await this.userRepository.save(user);
    return user;
  }

  public async addBlocked(id: string, blocked_id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.blockedUsers', 'blockedUsers')
      .where('user.id = :id', { id })
      .getOne();
    const blocked = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.blockedUsers', 'blockedUsers')
      .where('user.id = :id', { id: blocked_id })
      .getOne();
    if (user == null || blocked == null) {
      throw new Error('User not found');
    }
    if (user == blocked) {
      throw new Error('Cannot block yourself');
    }
    if (!user.blockedUsers) {
      user.blockedUsers = [];
    }
    user.blockedUsers.push(blocked);
    if (await this.isfriend(id, blocked_id)) {
      await this.removeFriends(user.id, blocked.id);
    }
    await this.userRepository.save(user);
    await this.userRepository.save(blocked);
    return user;
  }

  public async getBlocked(id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.blockedUsers', 'blockedUsers')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      return null;
    }
    return user.blockedUsers;
  }

  public async getChannels(id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.joinedChannels', 'channels')
      .leftJoinAndSelect('channels.users', 'users')
      .leftJoinAndSelect('channels.admins', 'admins')
      .leftJoinAndSelect('channels.creator', 'creator')
      .leftJoinAndSelect('channels.bannedUsers', 'bannedUsers')
      .leftJoinAndSelect('channels.mutedUsers', 'mutedUsers')
      .leftJoinAndSelect('mutedUsers.mutedUser', 'mutedUser')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      return null;
    }
    return user.joinedChannels;
  }

  public async getFriendRequests(id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.requestsReceived', 'requestsReceived')
      .leftJoinAndSelect('requestsReceived.sender', 'sender')
      .leftJoinAndSelect('requestsReceived.receiver', 'receiver')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      return null;
    }
    return user.requestsReceived;
  }

  public async addFriendRequest(id: string, friend_id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.requests', 'RequestFriend')
      .where('user.id = :id', { id: id })
      .getOne();
    const friend = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.requests', 'RequestFriend')
      .where('user.id = :id', { id: friend_id })
      .getOne();
    if (user == null || friend == null) {
      throw new Error('User not found');
    }
    if (user == friend) {
      throw new Error('Cannot add yourself as a friend');
    }
    if (!user.requestsReceived) {
      user.requestsReceived = [];
    }
    const friendrequest = new RequestFriend();
    friendrequest.sender = user;
    friendrequest.receiver = friend;
    return await this.requestsRepository.save(friendrequest);
  }

  public async removeFriendRequest(id: string, friend_id: string) {
    const requests = await this.requestsRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.sender', 'sender')
      .leftJoinAndSelect('request.receiver', 'receiver')
      .getMany();
    requests.forEach((request) => {
      if (request.sender.id == id && request.receiver.id == friend_id) {
        this.requestsRepository.delete(request);
      } else if (request.sender.id == friend_id && request.receiver.id == id) {
        this.requestsRepository.delete(request);
      }
    });
  }

  public async setName(id: string, name: string) {
    const user = await this.userRepository.findOneBy({ id: id });
    if (user == null) {
      return null;
    }
    const users = await this.userRepository.find();
    users.forEach((user) => {
      if (user.username == name) {
        throw new Error('Username already taken');
      }
    });

    const regex = /^[a-zA-Z0-9-_]+$/;
    if (!regex.test(name))
      throw new Error('Username must contain only alphanumeric characters');
    if (name.length > 10)
      throw new Error('Username must be less or equals than 10 characters');
    user.username = name;
    await this.userRepository.save(user);
    const send = {
      id: user.id,
      type: 'name',
    };
    this.server.emit('update_profil', send);
    return user;
  }

  public async setAvatar(id: string, buffer: NodeJS.ArrayBufferView, extname) {
    const fs = require('fs');
    const path = require('path');
    const lastimage = await this.getPathImage(id);
    if (lastimage != null) {
      fs.unlink(lastimage, (error) => {
        if (error) {
          console.error('Error deleting last image:', error);
        } else {
        }
      });
    }
    const imagePath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'images',
      `${id}${extname}`,
    );
    try {
      await fs.promises.access(path.dirname(imagePath));
    } catch (error) {
      fs.mkdirSync(path.dirname(imagePath), { recursive: true });
    }
    try {
      fs.writeFileSync(imagePath, buffer);
      const send = {
        id: id,
        type: 'image',
      };
      this.server.emit('update_profil', send);
      return imagePath;
    } catch (error) {
      return null;
    }
  }

  public async isfriendRoute(id: string, friend_id: string) {
    const user = await this.userRepository.findOneBy({ id: id });
    const friend = await this.userRepository.findOneBy({ id: friend_id });
    if (user == null || friend == null) {
      throw new Error('User not found');
    }
    if (user == friend) {
      throw new Error('user id and friend id are the same');
    }
    const res = { isfriend: await this.isfriend(id, friend_id) };
    return res;
  }

  public async getMpChannels(id: string) {
    const channels = await this.getChannels(id);
    if (channels == null) {
      return null;
    }
    return channels.filter((channel) => channel.type == ChannelType.MP_CHANNEL);
  }

  public async set2FASecret(secret: string, id: string) {
    const user = await this.getUserById(id, true);
    if (user == null) {
      return null;
    }
    user.secret2FA = secret;
    return await this.userRepository.save(user);
  }

  public async enabled2FA(id: string) {
    const user = await this.getUserById(id, true);
    if (user == null) {
      return false;
    }
    user.enabled2FA = true;
    await this.userRepository.save(user);
    return null;
  }

  public async disabled2FA(id: string) {
    let user = await this.userRepository.findOneBy({ id: id });
    if (user == null) {
      return false;
    }
    user.enabled2FA = false;
    user.secret2FA = null;
    user = await this.userRepository.save(user);
    return user != null;
  }

  public async isBlocked(myuser_id: string, user_id: string): Promise<boolean> {
    const myuser = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.blockedUsers', 'blockedUsers')
      .where('user.id = :id', { id: myuser_id })
      .getOne();
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.blockedUsers', 'blockedUsers')
      .where('user.id = :id', { id: user_id })
      .getOne();
    if (user == null || myuser == null) {
      return false;
    }
    return includeUser(user, myuser.blockedUsers);
  }

  public async OneOfTwoBlocked(
    myuser_id: string,
    user_id: string,
  ): Promise<boolean> {
    const myuser = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.blockedUsers', 'blockedUsers')
      .where('user.id = :id', { id: myuser_id })
      .getOne();
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.blockedUsers', 'blockedUsers')
      .where('user.id = :id', { id: user_id })
      .getOne();
    if (user == null || myuser == null) {
      return false;
    }
    myuser.blockedUsers.forEach((element) => {
      if (element.id == user.id) return true;
    });
    user.blockedUsers.forEach((element) => {
      if (element.id == myuser.id) return true;
    });
    return false;
  }

  public async getGames(id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.games', 'games')
      .where('user.id = :id', { id: id })
      .getOne();
    if (user == null) {
      return null;
    }
    return user.games;
  }

  public async getUserBySimilarNames(
    names: string,
    id: string,
    gethimself = false,
  ) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.blockedUsers', 'blockedUsers')
      .where('user.id = :id', { id: id })
      .getOne();
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username LIKE :name', { name: `%${names}%` })
      .getMany();
    const ret = [];
    for (const u of users) {
      if (u.id == user.id && gethimself == true) {
        ret.push(u);
      }
      if (!includeUser(u, user.blockedUsers) && u.id != user.id) {
        ret.push(u);
      }
    }
    return ret;
  }

  public async changeStatus(id: string, status: number) {
    const user = await this.userRepository.findOneBy({ id: id });
    if (user == null) {
      return null;
    }
    user.status = status;
    return await this.userRepository.save(user);
  }

  public async getstatus(id: string) {
    const user = await this.userRepository.findOneBy({ id: id });
    if (user == null) {
      return null;
    }
    return user.status;
  }

  public async check2FAenabled(id: string) {
    const user = await this.getUserById(id, true);
    if (user == null) {
      throw new Error('User not found');
    }
    return user.enabled2FA;
  }

  async signJwtToken(
    userId: string,
    email: string,
    isauth: boolean,
  ): Promise<{ access_token: string }> {
    let expiresTime = '5m';
    if (isauth == true) expiresTime = '2h';
    let check2FA: boolean;
    try {
      check2FA = await this.check2FAenabled(userId);
    } catch (error) {
      check2FA = false;
    }
    const payload = {
      sub: parseInt(userId),
      email: email,
      isauth: isauth,
      enabled2FA: check2FA,
    };
    return {
      access_token: await this.jwt.signAsync(payload, {
        expiresIn: expiresTime,
        secret: process.env.JWT_SECRET,
      }),
    };
  }

  async removeBlocked(id: string, blocked_id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.blockedUsers', 'blockedUsers')
      .where('user.id = :id', { id: id })
      .getOne();
    const blocked_user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.blockedUsers', 'blockedUsers')
      .where('user.id = :id', { id: blocked_id })
      .getOne();
    if (user == null || blocked_user == null) {
      throw new Error('User not found');
    }
    const blocks = [];
    for (const block of user.blockedUsers) {
      if (block.id != blocked_id) {
        blocks.push(block);
      }
    }
    user.blockedUsers = blocks;
    return await this.userRepository.save(user);
  }

  async removeFriends(id: string, friend_id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.friends', 'friends')
      .where('user.id = :id', { id: id })
      .getOne();
    const friend = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.friends', 'friends')
      .where('user.id = :id', { id: friend_id })
      .getOne();
    return await this.removeFriend(user, friend);
  }

  async removeFriend(user: User, blocked: User) {
    user.friends = user.friends.filter((element) => element.id != blocked.id);
    blocked.friends = blocked.friends.filter(
      (element) => element.id != user.id,
    );
    await this.userRepository.save(user);
    await this.userRepository.save(blocked);
    return true;
  }

  async getSecret2fa(id: string) {
    const user = await this.getUserById(id, true);
    if (user.secret2FA == null) {
      return null;
    }
    return user.secret2FA;
  }

  async endgame(user_id, iswin) {
    const user = await this.getUserById(user_id);
    if (user == null) {
      throw new Error('User not found');
    }
    if (iswin) {
      user.victories += 1;
      user.experience += 500;
    } else {
      user.defeats += 1;
      user.experience += 100;
    }
    await this.userRepository.save(user);
  }
}
