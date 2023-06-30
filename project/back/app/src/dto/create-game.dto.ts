import { IsNotEmpty } from 'class-validator';

export class CreateGameDTO {
  @IsNotEmpty({ message: 'user1_id is required' })
  user1_id: string;
  @IsNotEmpty({ message: 'user2_id is required' })
  user2_id: string;
}
