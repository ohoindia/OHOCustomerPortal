// Trusted operator operations; database and hashing are injected for offline tests.
function positiveId(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw Error("Invalid ID.");
}
async function manageAccess(db, hashPassword, data) {
  positiveId(data.companyId);
  if (!["list-access", "save-user"].includes(data.action)) throw Error("Invalid action.");
  let password = null;
  if (data.action === "save-user") {
    if (data.userId !== undefined) positiveId(data.userId);
    if (typeof data.name !== "string" || !data.name.trim() || data.name.trim().length > 120 ||
        typeof data.email !== "string" || data.email.length > 190 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) ||
        typeof data.role !== "string" || !data.role.trim() || data.role.length > 60 ||
        !["Active", "Disabled"].includes(data.status)) throw Error("Invalid user fields.");
    if (data.password !== undefined) {
      if (typeof data.password !== "string" || data.password.length < 12 || data.password.length > 128)
        throw Error("Password must be 12-128 characters.");
      password = await hashPassword(data.password);
    }
    if (!data.userId && !password) throw Error("New users require a password.");
  }
  return db.transaction(async (c) => {
    const [company] = await db.rows("SELECT Id,Name,IsActive FROM CorporateCompany WHERE Id=? FOR UPDATE", [data.companyId], c);
    if (!company) throw Error("Company does not exist.");
    if (data.action === "list-access") {
      const roles = await db.rows("SELECT Id,Name,Permissions FROM CorporateRole WHERE CompanyId=? ORDER BY Id", [data.companyId], c);
      const users = await db.rows("SELECT u.Id,u.Name,u.Email,u.Status,r.Name AS Role FROM CorporateUser u JOIN CorporateRole r ON r.Id=u.RoleId AND r.CompanyId=u.CompanyId WHERE u.CompanyId=? ORDER BY u.Id", [data.companyId], c);
      return { company, roles, users };
    }
    const [role] = await db.rows("SELECT Id,Permissions FROM CorporateRole WHERE CompanyId=? AND Name=?", [data.companyId, data.role.trim()], c);
    if (!role) throw Error("Role does not belong to this company.");
    const permissions = typeof role.Permissions === "string" ? JSON.parse(role.Permissions) : role.Permissions;
    const email = data.email.trim().toLowerCase();
    let userId = data.userId;
    if (userId) {
      const [user] = await db.rows("SELECT Id FROM CorporateUser WHERE CompanyId=? AND Id=? FOR UPDATE", [data.companyId, userId], c);
      if (!user) throw Error("User does not belong to this company.");
      if (data.status !== "Active" || !permissions.includes("access")) {
        const [admins] = await db.rows(`SELECT COUNT(*) AS total FROM CorporateUser u JOIN CorporateRole r ON r.Id=u.RoleId AND r.CompanyId=u.CompanyId WHERE u.CompanyId=? AND u.Id<>? AND u.Status='Active' AND JSON_CONTAINS(r.Permissions,'"access"')`, [data.companyId, userId], c);
        if (!Number(admins.total)) throw Error("Keep at least one active access administrator.");
      }
      await db.execute("UPDATE CorporateUser SET Name=?,Email=?,RoleId=?,Status=?,PasswordHash=COALESCE(?,PasswordHash) WHERE Id=? AND CompanyId=?", [data.name.trim(), email, role.Id, data.status, password, userId, data.companyId], c);
      await db.execute("DELETE FROM CorporateSession WHERE UserId=?", [userId], c);
    } else {
      const result = await db.execute("INSERT INTO CorporateUser (CompanyId,RoleId,Name,Email,PasswordHash,Status) VALUES (?,?,?,?,?,?)", [data.companyId, role.Id, data.name.trim(), email, password, data.status], c);
      userId = result.insertId;
    }
    await db.execute("INSERT INTO CorporateAudit (CompanyId,UserId,ActorName,Action) VALUES (?,0,'OHOINDIA',?)", [data.companyId, `${data.userId ? "Updated" : "Created"} portal user ${userId}; role ${data.role.trim()}; status ${data.status}`], c);
    return { companyId: data.companyId, userId, success: true };
  }, `corporate-company:${data.companyId}`);
}
module.exports = { manageAccess };
