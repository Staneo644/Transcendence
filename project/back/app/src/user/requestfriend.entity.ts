import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('requestfriend')
export class RequestFriend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne((type) => User, (user) => user.id)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne((type) => User, (user) => user.id)
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;
}
