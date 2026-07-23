import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { LoansModule } from './modules/loans/loans.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { Loan } from './modules/loans/entities/loan.entity';
import { LoanStep } from './modules/loans/entities/loan-step.entity';
import { LoanHistory } from './modules/loans/entities/loan-history.entity';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [Loan, LoanStep, LoanHistory],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    LoansModule,
    ProcessingModule,
    ReviewsModule,
    JobsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
