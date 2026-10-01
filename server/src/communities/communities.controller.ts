import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
@Controller('lambdaAPI/CommunityCustomers')
export class CommunityCustomersController {
  constructor(private readonly service: CommunitiesService) {}
  @Get('GetById/:id')
  customer(@Param('id', ParseIntPipe) id: number) { return this.service.customer(id); }
}
@Controller('lambdaAPI/Group')
export class GroupsController {
  constructor(private readonly service: CommunitiesService) {}
  @Get('GetById/:id')
  group(@Param('id', ParseIntPipe) id: number) { return this.service.group(id); }
}
