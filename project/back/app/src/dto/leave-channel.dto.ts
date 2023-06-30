import { IsNotEmpty } from 'class-validator';

export class LeaveChannelDto {
  @IsNotEmpty({ message: 'channel_id is required' })
  channel_id: string;
}
