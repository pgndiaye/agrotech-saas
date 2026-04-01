import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateListingDto {
  @ApiProperty({ example: 'Tomates fraîches - Qualité premium' })
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(1)
  price: number;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.1)
  quantity: number;

  @ApiProperty({ enum: ['SEEDS', 'FERTILIZER', 'HARVEST', 'EQUIPMENT', 'OTHER'] })
  @IsEnum(['SEEDS', 'FERTILIZER', 'HARVEST', 'EQUIPMENT', 'OTHER'])
  category: string;
}
