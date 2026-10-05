export interface Member {
  MemberId: number;
  Name?: string | null;
  MobileNumber?: string | null;
  Gender?: string | null;
  Age?: number | null;
  DateofBirth?: string | null;
  MemberTypeId?: string | null;
  AddressLine1?: string | null;
  AddressLine2?: string | null;
  Village?: string | null;
  City?: string | null;
  Image?: string | null;
  GroupId?: number | null;
  [key: string]: string | number | boolean | null | undefined;
}
export interface AuthResponse {
  status: boolean;
  message?: string;
  msg?: string;
  guid?: string;
  futureTime?: string;
  JwtToken?: string;
  tokenType?: "Bearer";
  expiresAt?: string;
  memberData?: Member[];
  data?: {
    customerId?: number;
  };
}
export type MemberProduct = {
  ShortDescription?: string | null;
  PaidAmount?: number | null;
  SumAssured?: number | null;
  MaximumMembers?: number | null;
  ProductCategoryName?: string | null;
  Policies?: Array<{
    PoliciesId?: number;
    PoliciesProductName?: string | null;
    PolicyCOINumber?: string | null;
    Dependents?: Array<{
      MemberDependentId?: number;
      DependentFullName?: string | null;
      DependentRelationship?: string | null;
      DependentDateofBirth?: string | null;
      DependentGender?: string | null;
    }>;
    Insurer?: Array<{
      InsurerDetailsId?: number;
      InsurerName?: string | null;
      InsurerRelationship?: string | null;
      InsurerDateofBirth?: string | null;
      InsurerGender?: string | null;
      InsurerMobileNumber?: string | null;
    }>;
    Nominees?: Array<{
      NomineeId?: number;
      NomineeFullName?: string | null;
      NomineeRelationship?: string | null;
    }>;
  }>;
  ProductName?: string;
  IssuedOn?: string;
  ValidTill?: string;
  MemberProductProductsId?: number;
  ProductsId?: number;
  IsFree?: boolean;
  IsActive?: boolean;
  MaximumAdult?: number;
  MaximumChild?: number;
};
export type MemberCard = {
  OHOCardnumber?: string;
  StartDate?: string;
  EndDate?: string;
  IsActivated?: boolean;
};
export type Appointment = {
  BookingConsultationId: number;
  Appointment?: string;
  TotalAmount?: number | string | null;
  PaidAmount?: number | string | null;
  AppointmentDate?: string;
  HospitalName?: string;
  ServiceName?: string;
  PoliciesType?: string;
  StatusName?: string;
  IsCouponClaimed?: boolean;
};
export type Verification = {
  status: boolean;
};
export type Group = {
  GroupName?: string;
  Name?: string;
};
export type ConfigEntry = {
  ConfigKey: string;
  ConfigValue: string | null;
};
