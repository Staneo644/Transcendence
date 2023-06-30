import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorator/auth.decorator';
import { JwtIsAuthGuard } from 'src/auth/guard/jwt.guard';
import { ChannelService } from './channel.service';
import { CreateChannelDto } from '../dto/create-channel.dto';
import { response } from 'express';
import { JoinChannelDto } from '../dto/join-channel.dto';
import { LeaveChannelDto } from '../dto/leave-channel.dto';
import { addAdminDto } from '../dto/add-admin.dto';
import { BanUserDto } from '../dto/ban-user.dto';
import { GetMessageDto } from '../dto/get-message.dto';
import { MpCreateDto } from '../dto/mp-create.dto';

@UseGuards(JwtIsAuthGuard)
@Controller('channel')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get()
  async getAccessibleChannels(
    @GetUser('sub') user_id: string,
    @Res() response,
  ) {
    let ret;
    try {
      ret = await this.channelService.getAccessibleChannels(user_id);
    } catch (e) {
      response.status(400).send(e.message);
      return;
    }
    return response.status(200).send(ret);
  }

  @Post('create')
  async createChannel(
    @Body() body: CreateChannelDto,
    @GetUser('sub') id: string,
    @Res() response,
  ) {
    body.creator_id = id;
    let ret;
    try {
      ret = await this.channelService.createChannel(body);
    } catch (e) {
      response.status(400).send(e.message);
      return;
    }
    response.status(201).send(ret);
    return;
  }

  @Post('join')
  async joinChannel(
    @Body() body: JoinChannelDto,
    @GetUser('sub') id: string,
    @Res() response,
  ) {
    let ret;
    try {
      ret = await this.channelService.joinChannel(body);
    } catch (e) {
      response.status(400).send(e.message);
      return;
    }
    return response.status(201).send(ret);
  }

  @Post('admin')
  async addAdmin(
    @Body() body: addAdminDto,
    @GetUser('sub') id: string,
    @Res() response,
  ) {
    let ret;
    try {
      ret = await this.channelService.addAdmin(body, id);
    } catch (e) {
      response.status(400).send(e.message);
      return;
    }
    response.status(200).send(ret);
    return;
  }

  @Get('admin')
  async getAdmin(@Body() body: addAdminDto, @GetUser('sub') id: string) {
    let ret;
    try {
      ret = await this.channelService.getAdmin(body, id);
    } catch (e) {
      response.status(400).send(e.message);
      return;
    }
    return ret;
  }

  @Delete('admin')
  async deleteAdmin(@Body() body: addAdminDto, @GetUser('sub') id: string) {
    let ret;
    try {
      ret = await this.channelService.deleteAdmin(body, id);
    } catch (e) {
      response.status(400).send(e.message);
      return;
    }
    response.status(200).send(ret);
    return;
  }

  @Post('ban')
  async banUser(@Body() body: BanUserDto, @GetUser('sub') id: string) {
    let ret;
    try {
      ret = await this.channelService.banUser(body, id);
    } catch (e) {
      response.status(400).send(e.message);
      return;
    }
    return ret;
  }

  @Get('ban')
  async getBanUser(@Body() body, @GetUser('sub') id: string) {
    if (body.channel_id == null) {
      response.status(400).send('channel_id is null');
      return;
    }
    let ret;
    try {
      ret = await this.channelService.getBanUser(body.channel_id, id);
    } catch (e) {
      response.status(400).send(e.message);
      return;
    }
    return ret;
  }

  @Delete('ban')
  async deleteBanUser(@Body() body: BanUserDto, @GetUser('sub') id: string) {
    let ret;
    try {
      ret = await this.channelService.deleteBanUser(body, id);
    } catch (e) {
      response.status(400).send(e.message);
      return;
    }
    return ret;
  }

  @Get('message/:id')
  async getMessages(
    @Body() body: GetMessageDto,
    @GetUser('sub') id: string,
    @Res() resp,
    @Param('id') channel_id,
  ) {
    let ret;
    try {
      ret = await this.channelService.getMessage(channel_id, id);
    } catch (e) {
      resp.status(400).send(e.message);
      return;
    }
    if (ret == null) {
      resp.status(204).send('No content');
      return;
    }
    return resp.status(200).send(ret);
  }

  @Get('/name/:name')
  async getChannelsByName(@Param('name') name: string, @Res() resp) {
    const channels = await this.channelService.getChannelsByName(name);
    if (channels == null) {
      return resp.status(204).send('No content');
    }
    return resp.status(200).send(channels);
  }

  @Get('/id/:id')
  async getChannelById(@Param('id') id: string, @Res() resp) {
    if (id == 'null' || id == null) {
      return resp.status(400).send('Invalid id');
    }
    const channel = await this.channelService.getChannelById(id);
    if (channel == null) {
      return resp.status(204).send('No content');
    }
    return resp.status(200).send(channel);
  }

  @Get('/available')
  async getAvailableChannels(@GetUser('sub') id: string, @Res() resp) {
    const channels = await this.channelService.getAvailableChannels(id);
    if (channels == null) {
      return resp.status(204).send('No content');
    }
    return resp.status(200).send(channels);
  }

  @Post('modifychannel/:id')
  async modifyChannel(
    @GetUser('sub') user_id,
    @Param('id') channel_id,
    @Body() body,
    @Res() resp,
  ) {
    let ret;
    try {
      ret = await this.channelService.updateChannel(channel_id, user_id, body);
    } catch (e) {
      resp.status(400).send(e.message);
      return;
    }
    return resp.status(200).send(ret);
  }
}
