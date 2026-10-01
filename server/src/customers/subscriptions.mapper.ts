import { DbRow } from "../database/database.service";

function project(row: DbRow, fields: string): DbRow {
  return Object.fromEntries(
    fields.split(" ").map((field) => [field, row[field] ?? null]),
  );
}
function unique(rows: DbRow[], key: string, allowZero = false): DbRow[][] {
  const groups = new Map<unknown, DbRow[]>();
  for (const row of rows) {
    if (row[key] == null || (!allowZero && Number(row[key]) === 0)) continue;
    const group = groups.get(row[key]) ?? [];
    group.push(row);
    groups.set(row[key], group);
  }
  return [...groups.values()];
}
const customerFields =
  "MemberId MemberTypeId Name Gender DateofBirth MobileNumber Email AddressLine1 AddressLine2 Village Mandal City MemberDistrictId MemberStateId MemberStateNameState MemberDistrictName Pincode RegisterOn MemberImage OHOCODE Age AlternateMobileNumber MemberEventId IsProfileCompleted";
const productFields =
  "MemberProductId MemberProductProductsId MemberProductIsCombo MemberProductMemberId IssuedOn ValidTill IsVerified Receipt ProductsId ProductName ProductImage LongDescription ShortDescription WelcomeEmail KeyFeatures ProductPCId PCId ProductCategoryName IsProductsAvailable IsFree SumAssured IsDefault MaximumAdult MaximumChild MinimumAge MaximumAge ChildrenAge MaximumMembers IsNomineeRequired SaleAmount IsCombo PaidAmount UTRNumber NoOfCardHolders";
const policyFields =
  "PoliciesId PoliciesMemberProductId PoliciesProductsId IndividualProductsId PoliciesProductName PoliciesMaximumAdult PoliciesMaximumChild PoliciesMaximumMembers PoliciesMinimumAge PoliciesMaximumAge PoliciesChildrenAge PoliciesIsNomineeRequired IsMembership PolicyDocument PolicyCOINumber PoliciesCustomerId";

/** CustomerController.TransformData: collapse the subscription view's joined rows. */
export function transformSubscriptions(rows: DbRow[]): DbRow[] {
  return unique(rows, "MemberId", true).flatMap((memberRows) => {
    const products = unique(memberRows, "MemberProductId", true).map(
      (productRows) => {
        const first = productRows[0];
        const product = project(first, productFields);
        product.RMId = first.EmployeeId ?? null;
        product.ProductEndorseEmail = first.EndorseEmail ?? null;
        for (const key of [
          "MemberProductIsCombo",
          "IsVerified",
          "IsProductsAvailable",
          "IsFree",
          "IsDefault",
          "IsNomineeRequired",
          "IsCombo",
        ])
          product[key] ??= false;
        for (const key of ["PCId", "SumAssured", "SaleAmount", "PaidAmount"])
          product[key] ??= 0;
        product.Policies = unique(productRows, "PoliciesId").map(
          (policyRows) => {
            const policyFirst = policyRows[0];
            const policy = project(policyFirst, policyFields);
            policy.PoliciesIsNomineeRequired ??= false;
            policy.IsMembership ??= false;
            policy.Dependents = unique(productRows, "MemberDependentId")
              .filter(
                (group) =>
                  group[0].DependentMemberId === policyFirst.PoliciesCustomerId,
              )
              .map((group) => ({
                ...project(
                  group[0],
                  "MemberDependentId DependentMemberId DependentFullName DependentRelationship DependentDateofBirth DependentGender",
                ),
                DependentProductsId: policyFirst.IndividualProductsId ?? null,
              }));
            policy.Insurer = unique(productRows, "InsurerDetailsId")
              .filter(
                (group) =>
                  group[0].InsurerDetailsId === policyFirst.PoliciesCustomerId,
              )
              .map((group) => ({
                ...project(
                  group[0],
                  "InsurerDetailsId InsurerMemberId InsurerName InsurerRelationship InsurerDateofBirth InsurerGender InsurerCardHolderType InsurerMobileNumber InsurerAge",
                ),
                InsurerProductsId: policyFirst.IndividualProductsId ?? null,
              }));
            policy.Nominees = unique(productRows, "NomineeId")
              .filter(
                (group) =>
                  group[0].NomineeProductsId ===
                  policyFirst.IndividualProductsId,
              )
              .map((group) =>
                project(
                  group[0],
                  "NomineeId NomineeMemberId NomineeFullName NomineeRelationship NomineeDateofBirth NomineeGender NomineeAge NomineeProductsId GuardianName GuardianRelationship GuardianDateofBirth GuardianGender",
                ),
              );
            return policy;
          },
        );
        return product;
      },
    );
    if (!products.length) return [];
    return [{ ...project(memberRows[0], customerFields), Products: products }];
  });
}
