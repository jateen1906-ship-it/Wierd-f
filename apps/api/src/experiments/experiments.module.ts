import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExperimentsController, UserExperimentsController } from './experiments.controller';
import { ExperimentsService } from './experiments.service';

@Module({
  imports: [DatabaseModule, AuthModule, NotificationsModule],
  controllers: [ExperimentsController, UserExperimentsController],
  providers: [ExperimentsService],
  exports: [ExperimentsService],
})
export class ExperimentsModule {}
