import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { SessionService } from "./session.service";

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [SessionService],
  exports: [SessionService],
})
export class AuthModule {}
