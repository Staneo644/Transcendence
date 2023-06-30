import { Channel } from 'src/channel/channel.entity';
import { Message } from 'src/channel/message.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany, ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { RequestFriend } from './requestfriend.entity';
import { Game } from 'src/game/game.entity';
import { UserStatus } from 'src/utils/user.enum';
import {Mute} from "../channel/mute.entity";

@Entity({ name: 'users' })
export class User {
  @PrimaryColumn()
  id: string;

  @Column()
  email: string;

  @Column()
  username: string;

  @Column({ default: 0 })
  experience: number;

  @ManyToMany((type) => User, (user) => user.friends)
  @JoinTable({
    name: 'friends',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'friend_id' },
  })
  friends: User[];

  @ManyToMany((type) => User, (user) => user.blockedUsers)
  @JoinTable({
    name: 'blocked_users',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'blocked_user_id' },
  })
  blockedUsers: User[];

  @ManyToMany((type) => Channel, (channel) => channel.users)
  joinedChannels: Channel[];

  @ManyToMany((type) => Channel, (channel) => channel.admins)
  adminChannels: Channel[];

  @ManyToMany((type) => Channel, (channel) => channel.bannedUsers)
  bannedChannels: Channel[];

  @OneToMany((type) => Message, (message) => message.user)
  messages: Message[];

  @OneToMany((type) => RequestFriend, (request) => request.sender)
  requests: RequestFriend[];

  @OneToMany((type) => RequestFriend, (request) => request.receiver)
  requestsReceived: RequestFriend[];

  @Column({ nullable: true, select: false })
  secret2FA: string;

  @Column({ default: false })
  enabled2FA: boolean;

  @OneToMany((type) => Game, (game) => game.user1 || game.user2)
  games: Game[];

  @Column({ default: UserStatus.DISCONNECTED })
  status: UserStatus;

  @OneToMany((type) => Channel, (channel) => channel.creator)
  createdChannels: Channel[];

  @Column({ nullable: false, default: 0 })
  victories: number;

  @Column({ nullable: false, default: 0 })
  defeats: number;

  @ManyToOne((type) => Mute, (channel) => channel.mutedUser)
  mutedChannels: Mute[];
}
