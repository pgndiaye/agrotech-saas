import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StockCategory {
  SEEDS = 'SEEDS',
  FERTILIZER = 'FERTILIZER',
  HARVEST = 'HARVEST',
  EQUIPMENT = 'EQUIPMENT',
  OTHER = 'OTHER',
}

export class CreateStockDto {
  @ApiProperty({ example: 'Mil (Pennisetum)' })
  @IsString()
  name: string;

  @ApiProperty({ enum: StockCategory })
  @IsEnum(StockCategory)
  category: StockCategory;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
