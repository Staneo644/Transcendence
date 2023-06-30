import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtIsAuthStrategy, JwtStrategy } from './strategy';
import { RequestFriend } from '../user/requestfriend.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({}),
    ConfigModule,
    TypeOrmModule.forFeature([RequestFriend]),
  ],
  providers: [
    AuthService,
    UserService,
    JwtService,
    ConfigService,
    JwtStrategy,
    JwtIsAuthStrategy,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
