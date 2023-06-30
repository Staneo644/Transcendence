import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Game, GameStatus } from './game.entity';
import { Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { CreateGameDTO } from 'src/dto/create-game.dto';
import { UserStatus } from '../utils/user.enum';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game) private gameRepository: Repository<Game>,
    private readonly userService: UserService,
  ) {}

  async createGame(body: CreateGameDTO) {
    const game = new Game();
    const user1 = await this.userService.getUserById(body.user1_id);
    const user2 = await this.userService.getUserById(body.user2_id);
    game.user1 = user1;
    game.user2 = user2;
    game.score1 = 0;
    game.score2 = 0;
    game.finished = GameStatus.INGAME;
    return await this.gameRepository.save(game);
  }

  async getGameById(id: string) {
    return await this.gameRepository.findOneBy({ id: id });
  }

  async finishGame(id: string, score1: number, score2: number) {
    const game = await this.gameRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.user1', 'user1')
      .leftJoinAndSelect('game.user2', 'user2')
      .where('game.id = :id', { id: id })
      .getOne();
    if (game == null) throw new Error('Game not found');
    await this.userService.changeStatus(game.user1.id, UserStatus.CONNECTED);
    await this.userService.changeStatus(game.user2.id, UserStatus.CONNECTED);
    if (score1 > score2) {
      await this.userService.endgame(game.user1.id, false);
      await this.userService.endgame(game.user2.id, true);
    } else {
      await this.userService.endgame(game.user1.id, true);
      await this.userService.endgame(game.user2.id, false);
    }
    game.score1 = score2;
    game.score2 = score1;
    game.finished = GameStatus.FINISHED;
    return await this.gameRepository.save(game);
  }

  async remakeGame(id: string) {
    const game = await this.gameRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.user1', 'user1')
      .leftJoinAndSelect('game.user2', 'user2')
      .where('game.id = :id', { id: id })
      .getOne();
    await this.userService.changeStatus(game.user1.id, UserStatus.CONNECTED);
    await this.userService.changeStatus(game.user2.id, UserStatus.CONNECTED);
    if (game == null) throw new Error('Game not found');
    if (game.finished == GameStatus.FINISHED)
      return await this.gameRepository.save(game);
    game.finished = GameStatus.REMAKE;
    return await this.gameRepository.save(game);
  }

  async getGameHistory(id: string) {
    const tabgame = [];
    const games1 = await this.gameRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.user1', 'user1')
      .leftJoinAndSelect('game.user2', 'user2')
      .where('user1.id = :id', { id: id })
      .getMany();
    const games2 = await this.gameRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.user1', 'user1')
      .leftJoinAndSelect('game.user2', 'user2')
      .where('user2.id = :id', { id: id })
      .getMany();
    tabgame.push(...games1, ...games2);
    return tabgame;
  }
}
