import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { StocksModule } from './stocks/stocks.module';
import { WeatherModule } from './weather/weather.module';
import { FinanceModule } from './finance/finance.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    StocksModule,
    WeatherModule,
    FinanceModule,
    MarketplaceModule,
    PaymentsModule,
  ],
})
export class AppModule {}
