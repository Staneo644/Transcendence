import { IsNotEmpty } from 'class-validator';

export class GetMessageDto {
  @IsNotEmpty({ message: 'channel_id is required' })
  channel_id: string;
}
