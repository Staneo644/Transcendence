import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service';
import { UserStatus } from '../../utils/user.enum';

@Injectable()
export class JwtIsAuthStrategy extends PassportStrategy(Strategy, 'jwtIsAuth') {
  constructor(private userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.userService.getUserById(payload.sub);
    if (user == null) return null;
    if (user.status == UserStatus.DISCONNECTED) return null;
    if (payload.isauth) return payload;
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.userService.getUserById(payload.sub);
    if (user == null) return null;
    if (
      user.status == UserStatus.IN_CONNECTION ||
      user.status == UserStatus.CONNECTED ||
      user.status == UserStatus.OFFLINE
    )
      return payload;
    return null;
  }
}
