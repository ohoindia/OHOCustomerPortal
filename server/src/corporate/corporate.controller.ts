import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Injectable,
  Module,
  Post,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { Public } from "../auth/jwt-auth.guard";
import { CorporateService, CorporateIdentity } from "./corporate.service";
import {
  AssignDto,
  CorporateLoginDto,
  EmployeeDto,
  IdDto,
  InventoryDto,
  RoleDto,
  UserDto,
} from "./corporate.dto";
interface CorporateRequest {
  headers: { authorization?: string };
  corporate: CorporateIdentity;
}
const token = (r: CorporateRequest) => {
  const value = /^Bearer ([a-f0-9]{64})$/.exec(r.headers.authorization ?? "");
  if (!value)
    throw new UnauthorizedException(
      "Please sign in to your corporate account.",
    );
  return value[1];
};
@Injectable()
class CorporateGuard implements CanActivate {
  constructor(private readonly service: CorporateService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<CorporateRequest>();
    request.corporate = await this.service.identity(token(request));
    return true;
  }
}
@Public()
@Controller("api/corporate")
class CorporateLoginController {
  constructor(private readonly service: CorporateService) {}
  @Post("login")
  login(@Body() body: CorporateLoginDto) {
    return this.service.login(body.email, body.password);
  }
}
@Public() // Separate corporate sessions; the guard below applies to every endpoint.
@UseGuards(CorporateGuard)
@Controller("api/corporate")
class CorporateController {
  constructor(private readonly service: CorporateService) {}
  @Get("workspace") workspace(@Req() r: CorporateRequest) {
    return this.service.workspace(r.corporate);
  }
  @Post("logout") logout(@Req() r: CorporateRequest) {
    return this.service.logout(token(r));
  }
  @Post("employees/save") employee(
    @Req() r: CorporateRequest,
    @Body() b: EmployeeDto,
  ) {
    return this.service.employee(r.corporate, b);
  }
  @Post("employees/remove") remove(
    @Req() r: CorporateRequest,
    @Body() b: IdDto,
  ) {
    return this.service.remove(r.corporate, b.id);
  }
  @Post("inventory/save") inventory(
    @Req() r: CorporateRequest,
    @Body() b: InventoryDto,
  ) {
    return this.service.inventory(r.corporate, b);
  }
  @Post("inventory/assign") assign(
    @Req() r: CorporateRequest,
    @Body() b: AssignDto,
  ) {
    return this.service.assign(r.corporate, b);
  }
  @Post("roles/save") role(@Req() r: CorporateRequest, @Body() b: RoleDto) {
    return this.service.role(r.corporate, b);
  }
  @Post("users/save") user(@Req() r: CorporateRequest, @Body() b: UserDto) {
    return this.service.user(r.corporate, b);
  }
}
@Module({
  controllers: [CorporateController, CorporateLoginController],
  providers: [CorporateService, CorporateGuard],
})
export class CorporateModule {}
