import { Module } from '@nestjs/common';
import { ExperimentVotesController, UserVotesController } from './votes.controller';
import { VotesService } from './votes.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ExperimentVotesController, UserVotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
