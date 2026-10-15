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
} from "class-validator";

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
export class EmployeeDto {
  @IsOptional() @IsInt() @Min(1) id?: number;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @Matches(/^[6-9]\d{9}$/) mobile!: string;
  @IsEmail() @MaxLength(190) email!: string;
  @IsString() @MinLength(1) @MaxLength(60) employeeCode!: string;
  @IsString() @MaxLength(100) department!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) joinedOn!: string;
  @IsIn(["Pending", "Active"]) status!: string;
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
