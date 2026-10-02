import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ThrottlerLimitDetail } from "@nestjs/throttler";
import { createHash } from "node:crypto";

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  protected generateKey(
    context: ExecutionContext,
    tracker: string,
    name: string,
  ) {
    // Global and authentication budgets cannot be bypassed by rotating routes.
    const scope = name === "sensitive" ? context.getHandler().name : "all";
    return createHash("sha256")
      .update(`${name}:${scope}:${tracker}`)
      .digest("hex");
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    context
      .switchToHttp()
      .getResponse()
      .setHeader("Retry-After", detail.timeToBlockExpire);
    return super.throwThrottlingException(context, detail);
  }
}
