import { DbRow } from '../database/database.service';

const memberFields = 'Name Gender DateofBirth MobileNumber Email AddressLine1 AddressLine2 Village Mandal City DistrictId StateId Pincode RegisterOn IsActive Image OHOCODE Age AlternateMobileNumber EventId EmployeeId IsProfileCompleted WhatsAppMobileNumber AadhaarNumber'.split(' ');
/** Explicit projection prevents Password and OTP columns from reaching clients. */
export function toMember(row: DbRow, community = false): DbRow {
  const result: DbRow = Object.fromEntries(memberFields.map(key => [key, row[key] ?? null]));
  result.MemberId = community ? 0 : row.CustomerId;
  result.MemberTypeId = row.CardHolderType ?? null;
  if (community) {
    result.RegisterOn = row.RegisteredOn ?? null;
    result.GroupId = row.GroupId ?? 0;
    result.CommunityCustomerId = row.CommunityCustomersId;
  }
  return result;
}
