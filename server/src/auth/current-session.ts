import { BadRequestException, createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SessionClaims } from './session.service';

export const CurrentSession = createParamDecorator((_data: unknown, context: ExecutionContext): SessionClaims => context.switchToHttp().getRequest().session);

export function requireOwner(session: SessionClaims, kind: 'customerId' | 'communityCustomerId' | 'groupId', id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new BadRequestException('A positive integer ID is required.');
  if (session[kind] !== id) throw new ForbiddenException('You cannot access another customer’s data.');
}
