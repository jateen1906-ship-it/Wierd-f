import { Module } from '@nestjs/common';
import {
  CookingResultsController,
  ExperimentCookingResultsController,
  UserCookingResultsController,
} from './cooking-results.controller';
import { CookingResultsService } from './cooking-results.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CookingResultsController,
    ExperimentCookingResultsController,
    UserCookingResultsController,
  ],
  providers: [CookingResultsService],
  exports: [CookingResultsService],
})
export class CookingResultsModule {}
