import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { RuntimeConfigService } from "../runtime-config/runtime-config.service";
import { DatabaseService } from "../database/database.service";

export interface SessionClaims {
  sub: string;
  customerId: number;
  communityCustomerId: number;
  groupId: number;
  credential: string;
  iat: number;
  exp: number;
}

export interface SessionIdentity {
  customerId: number;
  communityCustomerId: number;
  groupId: number;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: RuntimeConfigService,
    private readonly db: DatabaseService,
  ) {}

  private async settings() {
    const [secret, lifetime, issuer, audience] = await Promise.all([
      this.config.getSecret("JWT_SECRET"),
      this.config.get("JWT_TTL_SECONDS", "3600"),
      this.config.get("JWT_ISSUER", "oho-customer-server"),
      this.config.get("JWT_AUDIENCE", "oho-customer-app"),
    ]);
    const ttl = Number(lifetime);
    if (
      Buffer.byteLength(secret) < 32 ||
      !Number.isSafeInteger(ttl) ||
      ttl < 60 ||
      ttl > 86400 ||
      !issuer ||
      !audience
    ) {
      throw new ServiceUnavailableException(
        "JWT authentication is not configured.",
      );
    }
    return { secret, ttl, issuer, audience };
  }

  private fingerprint(password: string, secret: string) {
    return createHmac("sha256", secret)
      .update(`oho-credential:${password}`)
      .digest("hex");
  }

  async issue(identity: SessionIdentity, password: string, mobileSession = false) {
    const { secret, ttl, issuer, audience } = await this.settings();
    const now = Math.floor(Date.now() / 1000);
    // Device credentials remain valid until removed by logout or revoked by
    // account/password/signing-key changes. Keep a finite expiry in the contract.
    const expires = mobileSession ? 253402300799 : now + ttl;
    const JwtToken = await this.jwt.signAsync(
      {
        ...identity,
        sub:
          identity.customerId > 0
            ? `customer:${identity.customerId}`
            : `community:${identity.communityCustomerId}`,
        credential: this.fingerprint(password, secret),
        iat: now,
      },
      {
        secret,
        algorithm: "HS256",
        expiresIn: expires - now,
        issuer,
        audience,
        jwtid: randomUUID(),
      },
    );
    return {
      JwtToken,
      tokenType: "Bearer" as const,
      expiresAt: new Date(expires * 1000).toISOString(),
    };
  }

  async verify(token: string): Promise<SessionClaims> {
    const { secret, issuer, audience } = await this.settings();
    let claims: SessionClaims;
    try {
      claims = await this.jwt.verifyAsync<SessionClaims>(token, {
        secret,
        algorithms: ["HS256"],
        issuer,
        audience,
      });
    } catch {
      throw new UnauthorizedException(
        "Invalid or expired session. Please log in again.",
      );
    }
    if (
      !claims ||
      ![claims.customerId, claims.communityCustomerId, claims.groupId].every(
        (id) => Number.isSafeInteger(id) && id >= 0,
      ) ||
      (!claims.customerId && !claims.communityCustomerId) ||
      !Number.isSafeInteger(claims.exp) ||
      !Number.isSafeInteger(claims.iat) ||
      claims.iat > Math.floor(Date.now() / 1000) ||
      typeof claims.credential !== "string" ||
      claims.sub !==
        (claims.customerId > 0
          ? `customer:${claims.customerId}`
          : `community:${claims.communityCustomerId}`)
    ) {
      throw new UnauthorizedException("Invalid session.");
    }
    // A password change or account deactivation invalidates already-issued tokens.
    const rows =
      claims.customerId > 0
        ? await this.db.rows(
            "SELECT Password, IsActive, MobileNumber FROM Customer WHERE CustomerId = ?",
            [claims.customerId],
          )
        : await this.db.rows(
            "SELECT Password, IsActive, MobileNumber, GroupId FROM CommunityCustomers WHERE CommunityCustomersId = ?",
            [claims.communityCustomerId],
          );
    const account = rows[0];
    const expected = Buffer.from(
      this.fingerprint(String(account?.Password ?? ""), secret),
    );
    const actual = Buffer.from(claims.credential);
    if (
      !account ||
      account.IsActive === false ||
      account.IsActive === 0 ||
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      throw new UnauthorizedException(
        "Session has ended. Please log in again.",
      );
    }
    if (claims.communityCustomerId > 0) {
      const community =
        claims.customerId > 0
          ? (
              await this.db.rows(
                "SELECT GroupId, MobileNumber, IsActive FROM CommunityCustomers WHERE CommunityCustomersId = ?",
                [claims.communityCustomerId],
              )
            )[0]
          : account;
      if (
        !community ||
        community.IsActive === false ||
        community.IsActive === 0 ||
        community.MobileNumber !== account.MobileNumber ||
        Number(community.GroupId ?? 0) !== claims.groupId
      ) {
        throw new UnauthorizedException(
          "Community membership has changed. Please log in again.",
        );
      }
    } else if (claims.groupId !== 0)
      throw new UnauthorizedException("Invalid group session.");
    return claims;
  }
}
