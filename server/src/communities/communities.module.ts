import { Module } from '@nestjs/common';
import { CommunityCustomersController, GroupsController } from './communities.controller';
import { CommunitiesService } from './communities.service';
@Module({ controllers: [CommunityCustomersController, GroupsController], providers: [CommunitiesService] })
export class CommunitiesModule {}
