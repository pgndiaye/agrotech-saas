import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StockMovementDto {
  @ApiProperty({ enum: ['IN', 'OUT'] })
  @IsEnum(['IN', 'OUT'])
  type: 'IN' | 'OUT';

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
