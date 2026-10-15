// Run with the corporate application stopped; MySQL DDL commits automatically.
// Rerunnable after interruption: copy and verification precede legacy-table removal.
async function migrateEmployeeOnboarding(connection, { retainLegacyTable = false } = {}) {
  const columns = {
    OnboardingRequestId: "CHAR(36) NULL",
    OnboardingRequestHash: "CHAR(64) NULL",
    OnboardingOrderId: "INT NULL",
    OnboardingCreatedTime: "VARCHAR(19) NULL",
    OnboardingStatus: "ENUM('Ready','Processing','Completed','Review') NULL",
    OnboardingUpdatedAt: "TIMESTAMP NULL",
  };
  const [existing] = await connection.query("SHOW COLUMNS FROM CorporateEmployee");
  for (const [name, definition] of Object.entries(columns)) {
    if (!existing.some((column) => column.Field === name))
      await connection.query(`ALTER TABLE CorporateEmployee ADD COLUMN ${name} ${definition}`);
  }
  const [indexes] = await connection.query("SHOW INDEX FROM CorporateEmployee");
  for (const [name, fields] of Object.entries({
    uq_employee_onboarding_request: "CompanyId,OnboardingRequestId",
    uq_employee_onboarding_order: "OnboardingOrderId",
  })) {
    if (!indexes.some((index) => index.Key_name === name))
      await connection.query(`ALTER TABLE CorporateEmployee ADD UNIQUE KEY ${name} (${fields})`);
  }
  const [legacy] = await connection.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='CorporateOnboarding'",
  );
  if (!legacy.length) return;
  await connection.beginTransaction();
  try {
    const [[invalid]] = await connection.query(
      "SELECT COUNT(*) AS count FROM CorporateOnboarding b LEFT JOIN CorporateEmployee e ON e.Id=b.EmployeeId AND e.CompanyId=b.CompanyId WHERE e.Id IS NULL OR (e.OnboardingOrderId IS NOT NULL AND (NOT (e.OnboardingOrderId <=> b.OrderId) OR NOT (e.OnboardingRequestId <=> b.RequestId) OR NOT (e.OnboardingRequestHash <=> b.RequestHash) OR NOT (e.OnboardingCreatedTime <=> b.CreatedTime) OR NOT (e.OnboardingStatus <=> b.Status) OR NOT (e.OnboardingUpdatedAt <=> b.UpdatedAt)))",
    );
    if (Number(invalid.count)) throw Error("Conflicting or orphaned onboarding data; legacy table retained.");
    await connection.query(
      "UPDATE CorporateEmployee e JOIN CorporateOnboarding b ON b.EmployeeId=e.Id AND b.CompanyId=e.CompanyId SET e.OnboardingRequestId=b.RequestId,e.OnboardingRequestHash=b.RequestHash,e.OnboardingOrderId=b.OrderId,e.OnboardingCreatedTime=b.CreatedTime,e.OnboardingStatus=b.Status,e.OnboardingUpdatedAt=b.UpdatedAt",
    );
    const [[remaining]] = await connection.query(
      "SELECT COUNT(*) AS count FROM CorporateOnboarding b LEFT JOIN CorporateEmployee e ON e.Id=b.EmployeeId AND e.CompanyId=b.CompanyId WHERE e.Id IS NULL OR NOT (e.OnboardingRequestId <=> b.RequestId) OR NOT (e.OnboardingRequestHash <=> b.RequestHash) OR NOT (e.OnboardingOrderId <=> b.OrderId) OR NOT (e.OnboardingCreatedTime <=> b.CreatedTime) OR NOT (e.OnboardingStatus <=> b.Status) OR NOT (e.OnboardingUpdatedAt <=> b.UpdatedAt)",
    );
    if (Number(remaining.count)) throw Error("Onboarding copy verification failed; legacy table retained.");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
  if (!retainLegacyTable) await connection.query("DROP TABLE CorporateOnboarding");
}

module.exports = { migrateEmployeeOnboarding };
