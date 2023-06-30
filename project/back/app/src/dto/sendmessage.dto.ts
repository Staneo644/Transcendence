import { IsNotEmpty } from 'class-validator';

export class sendMessageDTO {
  @IsNotEmpty({ message: 'user_id is required' })
  channel_id: string;
  @IsNotEmpty({ message: 'content is required' })
  content: string;
}
