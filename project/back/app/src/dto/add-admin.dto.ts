import { IsNotEmpty } from 'class-validator';

export class addAdminDto {
  @IsNotEmpty({ message: 'channel_id is required' })
  channel_id: string;

  @IsNotEmpty({ message: 'user_id is required' })
  user_id: string;
}
