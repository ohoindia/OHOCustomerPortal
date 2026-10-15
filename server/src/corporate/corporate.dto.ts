import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsDateString,
  IsUUID,
  ValidateNested,
  ValidateIf,
  IsNumber,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { PersonDto } from "../purchases/purchase.dto";

export const permissions = [
  "employees",
  "inventory",
  "invoices",
  "access",
] as const;
export class CorporateLoginDto {
  @IsEmail() @MaxLength(190) email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}
export class ProvisionDto extends CorporateLoginDto {
  @IsString() @Matches(/\S/) @MinLength(2) @MaxLength(120) companyName!: string;
  @IsString() @Matches(/\S/) @MinLength(2) @MaxLength(120) name!: string;
}
export class EmployeeNomineeDto {
  @IsInt() @Min(1) productsId!: number;
  @IsInt() @Min(0) familyIndex!: number;
  // -1 selects the employee as guardian.
  @IsOptional() @IsInt() @Min(-1) guardianIndex?: number;
}
export class ExcelOrderDetailsDto {
  @IsOptional() @IsString() @MaxLength(200) addressLine1?: string;
  @IsOptional() @IsString() @MaxLength(200) addressLine2?: string;
  @IsOptional() @IsString() @MaxLength(20) village?: string;
  @IsOptional() @IsString() @MaxLength(20) mandal?: string;
  @IsOptional() @IsString() @MaxLength(20) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
  @IsOptional() @Matches(/^\d{6}$/) pinCode?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) paidAmount?: number;
}
export class EmployeeFamilyDto extends PersonDto {
  @IsOptional() @IsIn(["Secondary", "Family"]) cardHolderType?: string;
  @IsOptional() @ValidateNested() @Type(() => ExcelOrderDetailsDto) orderDetails?: ExcelOrderDetailsDto;
}
export class EmployeeDto {
  @IsOptional() @IsInt() @Min(1) id?: number;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @Matches(/^[6-9]\d{9}$/) mobile!: string;
  @ValidateIf((_object, value) => value !== "") @IsEmail() @MaxLength(190) email!: string;
  @IsString() @MinLength(1) @MaxLength(60) employeeCode!: string;
  @IsString() @MaxLength(100) department!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) joinedOn!: string;
  @IsIn(["Pending", "Active"]) status!: string;
  @IsOptional() @IsUUID() requestId?: string;
  @IsOptional() @IsInt() @Min(1) productsId?: number;
  @IsOptional() @IsDateString() dateofBirth?: string;
  @IsOptional() @IsIn(["Male", "Female", "Other"]) gender?: string;
  @IsOptional() @Matches(/^(?:\d{12}|\d{4} \d{4} \d{4})$/) ohoCardNumber?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20)
  @ValidateNested({ each: true }) @Type(() => EmployeeFamilyDto)
  family?: EmployeeFamilyDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(20)
  @ValidateNested({ each: true }) @Type(() => EmployeeNomineeDto)
  nominees?: EmployeeNomineeDto[];
  @IsOptional() @ValidateNested() @Type(() => ExcelOrderDetailsDto) orderDetails?: ExcelOrderDetailsDto;
}
export class IdDto {
  @IsInt() @Min(1) id!: number;
}
export class InventoryDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @MinLength(1) @MaxLength(60) sku!: string;
  @IsInt() @Min(1) quantity!: number;
}
export class AssignDto extends IdDto {
  @IsInt() @Min(1) employeeId!: number;
}
export class RoleDto {
  @IsString() @MinLength(2) @MaxLength(60) name!: string;
  @IsArray()
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(permissions, { each: true })
  permissions!: string[];
}
export class UserDto {
  @IsOptional() @IsInt() @Min(1) id?: number;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() @MaxLength(190) email!: string;
  @IsOptional() @IsString() @MinLength(12) @MaxLength(128) password?: string;
  @IsInt() @Min(1) roleId!: number;
  @IsIn(["Active", "Disabled"]) status!: string;
}
