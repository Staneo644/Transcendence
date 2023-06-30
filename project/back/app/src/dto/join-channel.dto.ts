import { IsNotEmpty } from 'class-validator';

export class JoinChannelDto {
  @IsNotEmpty({ message: 'channel_id is required' })
  channel_id: string;

  @IsNotEmpty({ message: 'user_id is required' })
  user_id: string;

  password: string;
}
