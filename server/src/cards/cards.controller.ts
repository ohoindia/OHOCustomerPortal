import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CardsService } from './cards.service';
@Controller('lambdaAPI/OHOCards')
export class CardsController {
  constructor(private readonly service: CardsService) {}
  @Get('GetMemberCardByMemberId/:id')
  getMemberCard(@Param('id', ParseIntPipe) id: number) { return this.service.getMemberCard(id); }
}
