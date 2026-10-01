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
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { CustomerIdDto, KycDto } from "../common/dto";
import { CustomersService } from "./customers.service";
@ApiTags("Customers")
@ApiBadRequestResponse({ description: "Malformed or invalid request." })
@ApiBearerAuth("jwt")
@ApiUnauthorizedResponse({
  description: "Missing, invalid, expired, or revoked session.",
})
@ApiForbiddenResponse({
  description: "Requested data does not belong to the authenticated account.",
})
@Controller("lambdaAPI/Customer")
export class CustomersController {
  constructor(private readonly service: CustomersService) {}
  @Get("GetById/:id")
  @ApiOperation({ summary: "Read your customer profile" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  })
  getById(
    @Param("id", ParseIntPipe) id: number,
    @CurrentSession() session: SessionClaims,
  ) {
    requireOwner(session, "customerId", id);
    return this.service.getById(id);
  }
  @Get("GetMemberProducts/:id")
  @ApiOperation({ summary: "Read your packages and policies" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  })
  products(
    @Param("id", ParseIntPipe) id: number,
    @CurrentSession() session: SessionClaims,
  ) {
    requireOwner(session, "customerId", id);
    return this.service.products(id);
  }
  @Get("AddressExistsOrNot/:id")
  @ApiOperation({ summary: "Check your address status" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "boolean" }, message: { type: "string" } },
      required: ["status"],
    },
  })
  address(
    @Param("id", ParseIntPipe) id: number,
    @CurrentSession() session: SessionClaims,
  ) {
    requireOwner(session, "customerId", id);
    return this.service.address(id);
  }
  @Post("KYCVerifiedOrNot")
  @HttpCode(200)
  @ApiOperation({ summary: "Check your Aadhaar verification" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "boolean" }, message: { type: "string" } },
      required: ["status"],
    },
  })
  kyc(@Body() dto: KycDto, @CurrentSession() session: SessionClaims) {
    requireOwner(session, "customerId", dto.customerId);
    return this.service.kyc(dto);
  }
  @Post("PANVerifiedOrNot")
  @HttpCode(200)
  @ApiOperation({ summary: "Check your PAN verification" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "boolean" }, message: { type: "string" } },
      required: ["status"],
    },
  })
  pan(@Body() dto: CustomerIdDto, @CurrentSession() session: SessionClaims) {
    requireOwner(session, "customerId", dto.customerId);
    return this.service.pan(dto.customerId);
  }
}
