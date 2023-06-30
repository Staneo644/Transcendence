import { IsNotEmpty } from 'class-validator';

export class BanUserDto {
  @IsNotEmpty({ message: 'user_id is required' })
  user_id: string;

  @IsNotEmpty({ message: 'channel_id is required' })
  channel_id: string;
}
