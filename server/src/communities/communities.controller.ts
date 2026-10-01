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
import { CommunitiesService } from "./communities.service";
@ApiTags("Communities")
@ApiBadRequestResponse({ description: "Malformed or invalid request." })
@ApiBearerAuth("jwt")
@ApiUnauthorizedResponse({
  description: "Missing, invalid, expired, or revoked session.",
})
@ApiForbiddenResponse({
  description: "Requested data does not belong to the authenticated account.",
})
@Controller("api/CommunityCustomers")
export class CommunityCustomersController {
  constructor(private readonly service: CommunitiesService) {}
  @Get("GetById/:id")
  @ApiOperation({ summary: "Read your community customer profile" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  })
  customer(
    @Param("id", ParseIntPipe) id: number,
    @CurrentSession() session: SessionClaims,
  ) {
    requireOwner(session, "communityCustomerId", id);
    return this.service.customer(id);
  }
}
@ApiTags("Communities")
@ApiBadRequestResponse({ description: "Malformed or invalid request." })
@ApiBearerAuth("jwt")
@ApiUnauthorizedResponse({
  description: "Missing, invalid, expired, or revoked session.",
})
@ApiForbiddenResponse({
  description: "Requested data does not belong to the authenticated account.",
})
@Controller("api/Group")
export class GroupsController {
  constructor(private readonly service: CommunitiesService) {}
  @Get("GetById/:id")
  @ApiOperation({ summary: "Read your community group" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  })
  group(
    @Param("id", ParseIntPipe) id: number,
    @CurrentSession() session: SessionClaims,
  ) {
    requireOwner(session, "groupId", id);
    return this.service.group(id);
  }
}
