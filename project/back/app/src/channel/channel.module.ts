import { Module } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';
import { Channel } from './channel.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/user.entity';
import { UserService } from 'src/user/user.service';
import { UserModule } from 'src/user/user.module';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Message } from './message.entity';
import { RequestFriend } from '../user/requestfriend.entity';
import { ChannelGateway } from './channel.gateway';
import { Mute } from "./mute.entity";


@Module({
  providers: [
    AuthService,
    JwtService,
    ConfigService,
    UserService,
    ChannelGateway,
    ChannelService,
  ],
  controllers: [ChannelController],
  imports: [
    TypeOrmModule.forFeature([Message]),
    TypeOrmModule.forFeature([Channel]),
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([RequestFriend]),
    TypeOrmModule.forFeature([Mute]),
    AuthModule,
    ConfigModule,
    UserModule,
  ],
})
export class ChannelModule {}
