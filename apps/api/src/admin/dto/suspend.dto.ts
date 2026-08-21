import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuspendDto {
  @ApiProperty({
    example: 'Impayé depuis 3 mois',
    description: 'Motif de la suspension, conservé et affiché dans le journal',
  })
  @IsString()
  @MinLength(3)
  reason: string;
}
