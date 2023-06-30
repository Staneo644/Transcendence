import { User } from 'src/user/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum GameStatus {
  INGAME = 'INGAME',
  REMAKE = 'REMAKE',
  FINISHED = 'FINISHED',
}

@Entity()
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne((type) => User, (user) => user.games)
  user1: User;

  @ManyToOne((type) => User, (user) => user.games)
  user2: User;

  @Column({ default: 0 })
  score1: number;

  @Column({ default: 0 })
  score2: number;

  @Column({ default: GameStatus.INGAME })
  finished: GameStatus;
}
