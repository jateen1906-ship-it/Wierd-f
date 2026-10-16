import { Module } from '@nestjs/common';
import {
  CookingResultsController,
  ExperimentCookingResultsController,
  UserCookingResultsController,
} from './cooking-results.controller';
import { CookingResultReactionsController, UserReactionsController } from './reactions.controller';
import { CookingResultsService } from './cooking-results.service';
import { ReactionsService } from './reactions.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    CookingResultsController,
    ExperimentCookingResultsController,
    UserCookingResultsController,
    CookingResultReactionsController,
    UserReactionsController,
  ],
  providers: [CookingResultsService, ReactionsService],
  exports: [CookingResultsService, ReactionsService],
})
export class CookingResultsModule {}
