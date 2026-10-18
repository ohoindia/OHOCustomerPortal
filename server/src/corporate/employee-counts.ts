import { DatabaseService } from "../database/database.service";

// Use the same definitions in the company workspace and the Group access panel.
// Portal login accounts are deliberately excluded from employee/member counts.
export async function employeeCounts(db: DatabaseService, companyId: number) {
  const [row] = await db.rows(
    `SELECT
      (SELECT COUNT(*) FROM CommunityCustomers m WHERE m.GroupId=c.GroupId) AS groupMembers,
      (SELECT COUNT(*) FROM CorporateEmployee e WHERE e.CompanyId=c.Id AND e.Status<>'Removed') AS total,
      (SELECT COUNT(*) FROM CorporateEmployee e WHERE e.CompanyId=c.Id AND e.Status='Active') AS active,
      (SELECT COUNT(*) FROM CorporateEmployee e WHERE e.CompanyId=c.Id AND e.Status='Pending') AS pending,
      (SELECT COUNT(*) FROM CorporateEmployee e WHERE e.CompanyId=c.Id AND e.Status<>'Removed' AND e.OnboardingStatus='Completed') AS onboarded
    FROM CorporateCompany c WHERE c.Id=?`,
    [companyId],
  );
  return Object.fromEntries(
    ["groupMembers", "total", "active", "pending", "onboarded"].map((key) => [key, Number(row?.[key] ?? 0)]),
  );
}
