import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard, JwtIsAuthGuard } from './guard/jwt.guard';
import { GetUser } from './decorator/auth.decorator';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { UserStatus } from '../utils/user.enum';
import { UserService } from 'src/user/user.service';
import * as process from 'process';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @Get('login')
  redirectLogin(@Res() res) {
    res.redirect(
      'https://api.intra.42.fr/oauth/authorize?client_id=' +
        process.env.APP_ID +
        '&redirect_uri=' +
        process.env.APP_REDIRECT_URI +
        '&response_type=code',
    );
  }

  @Get('callback')
  async getLogin(@Query() id, @Res() res) {
    const ip = process.env.IP;
    if (id.code == null) {
      return res.redirect(ip + ':8080/error');
    }

    const user = await this.userService.createUsers(id.code);
    if (user == null) {
      return res.status(400).send('Bad User');
    }
    const code = await this.userService.signJwtToken(
      user.id,
      user.email,
      false,
    );
    res.redirect(ip + ':8080/authenticate?access_token=' + code.access_token);
    return;
  }

  @UseGuards(JwtIsAuthGuard)
  @Get('2fa/create')
  async create2fa(@GetUser('sub') id, @Res() res) {
    const user = await this.userService.getUserById(id, true);
    if (user == null) {
      return res.status(400).send('Bad User');
    }
    if (user.enabled2FA == true) {
      return res
        .status(400)
        .send('Bad Request : 2 factor authentication already set');
    }
    const secret = await authenticator.generateSecret();

    const otpauthUrl = authenticator.keyuri(
      user.email,
      'Transcendence',
      secret,
    );

    if ((await this.userService.set2FASecret(secret, user.id)) == null) {
      return res.status(400).send('Bad Request : Error while saving secret');
    }
    return res.status(200).send(await toDataURL(otpauthUrl));
  }

  @UseGuards(JwtIsAuthGuard)
  @Post('2fa/enable')
  async turnOn2FA(@GetUser('sub') id, @Res() res, @Body() body) {
    const user = await this.userService.getUserById(id, true);
    if (user == null) {
      res.status(400).send('Bad User');
      return;
    }
    if ((await this.userService.getSecret2fa(user.id)) == null) {
      return res
        .status(400)
        .send(
          'Bad Request : You need to create a two factor authentication secret first',
        );
    }
    const code2FA = body.code;
    if (code2FA == null) {
      return res.status(400).send('Bad Request : You need to provide a code');
    }
    const isValid: boolean = await this.authService.verify2FA(
      user.secret2FA,
      code2FA,
    );
    if (!isValid) {
      return res
        .status(400)
        .send('Bad Request : Wrong two factor authentication code');
    }
    await this.userService.enabled2FA(id);
    return res.status(200).send(true);
  }

  @UseGuards(JwtAuthGuard)
  @Get('2fa/is2FA')
  async is2FA(@GetUser('sub') id, @Res() res) {
    const user = await this.userService.getUserById(id);
    if (user == null) {
      return res.status(400).send('Bad User');
    }
    return res.status(200).send(user.enabled2FA);
  }

  @UseGuards(JwtAuthGuard)
  @Post('authenticate')
  async authenticate2FA(@GetUser() jwtUser, @Res() res, @Body() body) {
    const id = jwtUser.sub;
    let user = await this.userService.getUserById(id, true);
    if (user == null) {
      return res.status(400).send('Bad User');
    }
    if (user.enabled2FA == true) {
      const code2FA = body.code;
      if (code2FA == null) {
        res
          .status(400)
          .send('Bad Request : Wrong two factor authentication code');
        return;
      }
      const isValid: boolean = await this.authService.verify2FA(
        user.secret2FA,
        code2FA,
      );

      if (!isValid) {
        res
          .status(400)
          .send('Bad Request : Wrong two factor authentication code');
        return;
      }
    }
    user = await this.userService.changeStatus(id, UserStatus.CONNECTED);
    if (user == null) {
      res.status(400).send('unrecognized user');
      return;
    }
    const token = await this.userService.signJwtToken(
      user.id,
      user.email,
      true,
    );
    res.send(token);
    return;
  }

  @UseGuards(JwtIsAuthGuard)
  @Get('2fa/disable')
  async turnOff2FA(@GetUser('sub') id, @Res() res) {
    const user = await this.userService.getUserById(id);
    if (user == null) {
      res.status(400).send('Bad User');
      return;
    }
    if ((await this.userService.getSecret2fa(user.id)) == null) {
      res
        .status(400)
        .send(
          "Bad Request : You don't have the two factor authentication enabled",
        );
      return;
    }
    await this.userService.disabled2FA(id);
    res.status(200).send(true);
    return;
  }

  @UseGuards(JwtAuthGuard)
  @Get('logout')
  async logout(@GetUser('sub') id, @Req() req, @Res() res) {
    if (
      (await this.userService.changeStatus(id, UserStatus.DISCONNECTED)) == null
    )
      res.status(400).send('Bad User');
    req.logout((err) => {
      if (err) {
        res.status(400).send(err);
      }
      res.redirect('/');
    });
  }
}
