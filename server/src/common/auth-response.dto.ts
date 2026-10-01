import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuthResponseDto {
  @ApiProperty({
    description: "Business success; false responses may still have HTTP 200.",
    example: true,
  })
  status!: boolean;
  @ApiPropertyOptional() message?: string;
  @ApiPropertyOptional() msg?: string;
  @ApiPropertyOptional({
    format: "uuid",
    description: "Returned when an OTP is sent successfully.",
  })
  guid?: string;
  @ApiPropertyOptional({ format: "date-time", description: "OTP expiry time." })
  futureTime?: string;
  @ApiPropertyOptional({
    description:
      "Signed access token returned by successful login or registration.",
  })
  JwtToken?: string;
  @ApiPropertyOptional({ enum: ["Bearer"] }) tokenType?: string;
  @ApiPropertyOptional({
    format: "date-time",
    description: "Access token expiry time.",
  })
  expiresAt?: string;
  @ApiPropertyOptional({
    type: "array",
    items: { type: "object", additionalProperties: true },
    description:
      "Login profile. MemberId is zero for community-only accounts. Password and OTP fields are excluded.",
  })
  memberData?: Record<string, unknown>[];
  @ApiPropertyOptional({
    type: "object",
    properties: { customerId: { type: "integer", example: 12 } },
    description: "Created customer ID on registration.",
  })
  data?: { customerId: number };
}
