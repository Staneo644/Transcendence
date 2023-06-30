import { Channel } from 'src/channel/channel.entity';
import { User } from 'src/user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('message')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column()
  date: Date;

  @ManyToOne((type) => User, (user) => user.messages)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne((type) => Channel, (channel) => channel.messages)
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;
}
