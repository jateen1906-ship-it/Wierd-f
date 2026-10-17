import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { configuration } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ExperimentsModule } from './experiments/experiments.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { CookingResultsModule } from './cooking-results/cooking-results.module';
import { VotesModule } from './votes/votes.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    AuthModule,
    ExperimentsModule,
    IngredientsModule,
    CookingResultsModule,
    VotesModule,
    UsersModule,
    NotificationsModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
