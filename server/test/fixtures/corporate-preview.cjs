// Local UI fixture only. Not imported by the production server. No database writes.
const { createServer } = require("node:http");
const permissions = ["employees", "inventory", "invoices", "access"];
const workspace = {
  products: [{ id: 10, name: "Example group family plan", maximumMembers: 4, requiresSpouse: false, nominees: [] }],
  company: { id: 1, name: "Example Company", groupId: 100 },
  identity: {
    userId: 1,
    companyId: 1,
    name: "Example Admin",
    email: "admin@example.test",
    role: "Admin",
    permissions,
  },
  employees: [
    {
      id: 1,
      customerId: 10,
      communityCustomerId: 20,
      name: "Example Employee",
      mobile: "9876543210",
      email: "employee@example.test",
      employeeCode: "EMP-001",
      department: "Operations",
      joinedOn: "2026-10-01",
      status: "Active",
    },
    {
      id: 2,
      customerId: null,
      communityCustomerId: 21,
      name: "New Employee",
      mobile: "9876543211",
      email: "new@example.test",
      employeeCode: "EMP-002",
      department: "Sales",
      joinedOn: "2026-10-15",
      status: "Pending",
    },
  ],
  inventory: [
    {
      id: 1,
      name: "Employee welcome kit",
      sku: "KIT-001",
      quantity: 10,
      assigned: 1,
    },
  ],
  invoices: [
    {
      id: 1,
      number: "OHO-EXAMPLE-001",
      issuedOn: "2026-10-01",
      dueOn: "2026-10-30",
      amountPaise: 125000,
      status: "Due",
      description: "Example company service subscription",
    },
  ],
  roles: [
    { id: 1, name: "Admin", permissions, isSystem: true },
    {
      id: 2,
      name: "HR",
      permissions: ["employees", "inventory"],
      isSystem: true,
    },
  ],
  users: [
    {
      id: 1,
      name: "Example Admin",
      email: "admin@example.test",
      roleId: 1,
      role: "Admin",
      status: "Active",
    },
  ],
  activity: [
    {
      action: "Company portal provisioned",
      actor: "OHOINDIA",
      createdAt: "2026-10-15T09:00:00Z",
    },
  ],
};
createServer(async (req, res) => {
  let text = "";
  for await (const chunk of req) text += chunk;
  const body = text ? JSON.parse(text) : {};
  let result = { success: true };
  if (req.url === "/api/corporate/login") result = { token: "a".repeat(64) };
  else if (req.url === "/api/corporate/workspace") result = workspace;
  else if (req.url === "/api/corporate/employees/save") {
    if (body.id)
      Object.assign(
        workspace.employees.find((e) => e.id === body.id),
        body,
      );
    else {
      const employee = {
        ...body,
        id: workspace.employees.length + 1,
        customerId: 100,
        communityCustomerId: 100,
      };
      workspace.employees.push(employee);
      result = { success: true, employeeId: employee.id, orderId: 900, onboardingStatus: "Completed", message: "Local sample employee created. No real order or card was issued." };
    }
  } else if (req.url === "/api/corporate/employees/customer") {
    const employee = workspace.employees.find((e) => e.id === body.id);
    result = {
      customerId: employee?.customerId ?? null,
      onboarding: { orderId: 900, status: "Completed" },
      cards: [{ number: employee?.ohoCardNumber || "123456789012", startDate: "2026-10-15", endDate: "2027-10-14", active: true }],
      products: [{ id: 10, name: "Example group family plan", issuedOn: "2026-10-15", validTill: "2027-10-14" }],
      family: (employee?.family ?? []).map((person, index) => ({ id: index + 1, name: person.fullName, cardHolderType: person.cardHolderType || (person.relationship === "Spouse" ? "Secondary" : "Family"), ...person })),
    };
  } else if (req.url === "/api/corporate/employees/provision") {
    result = { success: true, message: "Local sample only. No real card API call." };
  } else if (req.url === "/api/corporate/roles/save")
    workspace.roles.push({
      ...body,
      id: workspace.roles.length + 1,
      isSystem: false,
    });
  else if (req.url !== "/api/corporate/logout") {
    res.statusCode = 404;
    result = { message: "Not implemented in local UI fixture" };
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(result));
}).listen(Number(process.env.CORPORATE_PREVIEW_PORT || 3001), "127.0.0.1", () =>
  console.log(
    `Local corporate UI fixture at 127.0.0.1:${process.env.CORPORATE_PREVIEW_PORT || 3001}; example data only.`,
  ),
);
