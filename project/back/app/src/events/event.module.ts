import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { User } from 'src/user/user.entity';
import { UserService } from 'src/user/user.service';
import { EventsGateway } from './events.gateway';
import { Channel } from 'src/channel/channel.entity';
import { ChannelService } from 'src/channel/channel.service';
import { GameService } from 'src/game/game.service';
import { Game } from 'src/game/game.entity';
import { Message } from '../channel/message.entity';
import { RequestFriend } from '../user/requestfriend.entity';
import {Mute} from "../channel/mute.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestFriend]),
    TypeOrmModule.forFeature([Message]),
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([Channel]),
    TypeOrmModule.forFeature([Game]),
    TypeOrmModule.forFeature([Mute]),
  ],
  controllers: [],
  providers: [
    EventsGateway,
    UserService,
    AuthService,
    JwtService,
    ConfigService,
    ChannelService,
    GameService,
  ],
})
export class EventModule {}
