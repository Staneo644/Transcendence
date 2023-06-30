import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './game.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from 'src/user/user.entity';
import { UserService } from 'src/user/user.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/user.module';
import { RequestFriend } from '../user/requestfriend.entity';

@Module({
  providers: [GameService, AuthService, JwtService, ConfigService, UserService],
  controllers: [GameController],
  imports: [
    TypeOrmModule.forFeature([RequestFriend]),
    TypeOrmModule.forFeature([Game]),
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    AuthModule,
    UserModule,
  ],
})
export class GameModule {}
