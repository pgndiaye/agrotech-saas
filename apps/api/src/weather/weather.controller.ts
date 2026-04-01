import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeatherService } from './weather.service';

@ApiTags('Météo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('weather')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  @Get()
  @ApiQuery({ name: 'city', required: false, example: 'Dakar' })
  getCurrent(@Query('city') city: string = 'Dakar') {
    return this.weatherService.getWeatherByCity(city);
  }

  @Get('forecast')
  @ApiQuery({ name: 'city', required: false, example: 'Dakar' })
  getForecast(@Query('city') city: string = 'Dakar') {
    return this.weatherService.getForecast(city);
  }
}
