import { IsNotEmpty } from 'class-validator';

export class CreateChannelDto {
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @IsNotEmpty({ message: 'type is required' })
  type: number;

  @IsNotEmpty({ message: 'creator_id is required' })
  creator_id: string;

  password: string;
}
