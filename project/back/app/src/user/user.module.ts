import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RequestFriend } from './requestfriend.entity';
import { UserGateway } from './user.gateway';
import { ChannelService } from '../channel/channel.service';
import { Channel } from '../channel/channel.entity';
import { Message } from '../channel/message.entity';
import {Mute} from "../channel/mute.entity";

@Module({
  providers: [
    UserService,
    AuthService,
    JwtService,
    ConfigService,
    UserGateway,
    ChannelService,
  ],
  controllers: [UserController],
  imports: [
    TypeOrmModule.forFeature([User]),
    AuthModule,
    ConfigModule,
    TypeOrmModule.forFeature([RequestFriend]),
    TypeOrmModule.forFeature([Channel]),
    TypeOrmModule.forFeature([Message]),
    TypeOrmModule.forFeature([Mute]),
  ],
})
export class UserModule {}
