import { IsNotEmpty } from 'class-validator';

export class MpCreateDto {
  @IsNotEmpty({ message: 'user_id is required' })
  user_id: string;
}
