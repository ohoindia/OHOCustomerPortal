import {
  ApiTags,
  ApiOperation,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from "@nestjs/swagger";
import { CurrentSession, requireOwner } from "../auth/current-session";
import { SessionClaims } from "../auth/session.service";
import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { CardsService } from "./cards.service";
@ApiTags("Membership")
@ApiBadRequestResponse({ description: "Malformed or invalid request." })
@ApiBearerAuth("jwt")
@ApiUnauthorizedResponse({
  description: "Missing, invalid, expired, or revoked session.",
})
@ApiForbiddenResponse({
  description: "Requested data does not belong to the authenticated account.",
})
@Controller("api/OHOCards")
export class CardsController {
  constructor(private readonly service: CardsService) {}
  @Get("GetMemberCardByMemberId/:id")
  @ApiOperation({ summary: "Read your membership card" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        status: { type: "boolean" },
        returnData: {
          type: "array",
          items: { type: "object", additionalProperties: true },
        },
      },
      required: ["status"],
    },
  })
  getMemberCard(
    @Param("id", ParseIntPipe) id: number,
    @CurrentSession() session: SessionClaims,
  ) {
    requireOwner(session, "customerId", id);
    return this.service.getMemberCard(id);
  }
}
