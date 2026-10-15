import React, { useEffect, useRef, useState } from "react";
import type {
  Employee,
  Inventory,
  Permission,
  PortalUser,
  Workspace,
} from "./api";
import { exportCsv, login, logout, money, request } from "./api";

type Section =
  | "Overview"
  | "Employees"
  | "Onboarding"
  | "Invoices"
  | "Inventory"
  | "Roles & access";
type Modal =
  | { kind: "employee"; employee?: Employee }
  | { kind: "remove"; employee: Employee }
  | { kind: "inventory" }
  | { kind: "assign"; item: Inventory }
  | { kind: "role" }
  | { kind: "user"; user?: PortalUser };
const allPermissions: Permission[] = [
  "employees",
  "inventory",
  "invoices",
  "access",
];
const date = (value: string) =>
  new Date(
    value.length > 10 ? value : value + "T00:00:00+05:30",
  ).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        oho<span>+</span>
      </span>
      <div>
        <strong>OHOINDIA</strong>
        <small>CORPORATE PORTAL</small>
      </div>
    </div>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className={`badge badge-${String(children).toLowerCase()}`}>
      {children}
    </span>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <span>◇</span>
      <h3>Nothing here yet</h3>
      <p>{text}</p>
    </div>
  );
}
function Field({
  label,
  name,
  value,
  type = "text",
  required = true,
  min,
  maxLength,
  pattern,
  readOnly = false,
}: {
  label: string;
  name: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  min?: number;
  maxLength?: number;
  pattern?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        min={min}
        maxLength={maxLength}
        pattern={pattern}
        readOnly={readOnly}
        autoComplete={type === "password" ? "new-password" : "off"}
      />
    </label>
  );
}
function Dialog({
  modal,
  data,
  close,
  save,
  busy,
  error,
}: {
  modal: Modal;
  data: Workspace;
  close: () => void;
  save: (path: string, body: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const title =
    modal.kind === "employee"
      ? modal.employee
        ? "Edit employee"
        : "Onboard an employee"
      : modal.kind === "remove"
        ? "Remove from company?"
        : modal.kind === "inventory"
          ? "Add inventory"
          : modal.kind === "assign"
            ? "Assign inventory"
            : modal.kind === "role"
              ? "Create a role"
              : modal.user
                ? "Edit portal access"
                : "Add portal user";
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(form.entries());
    let path = "";
    switch (modal.kind) {
      case "employee":
        path = "employees/save";
        if (modal.employee) body.id = modal.employee.id;
        break;
      case "remove":
        path = "employees/remove";
        body.id = modal.employee.id;
        break;
      case "inventory":
        path = "inventory/save";
        body.quantity = Number(body.quantity);
        break;
      case "assign":
        path = "inventory/assign";
        body.id = modal.item.id;
        body.employeeId = Number(body.employeeId);
        break;
      case "role":
        path = "roles/save";
        body.permissions = form.getAll("permissions");
        break;
      case "user":
        path = "users/save";
        body.roleId = Number(body.roleId);
        if (modal.user) body.id = modal.user.id;
        if (!body.password) delete body.password;
        break;
    }
    await save(path, body);
  }
  return (
    <dialog
      ref={ref}
      className="portal-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
      aria-labelledby="dialog-title"
    >
      <form onSubmit={submit}>
        <div className="dialog-head">
          <div>
            <span className="eyebrow">COMPANY WORKSPACE</span>
            <h2 id="dialog-title">{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={close}
            disabled={busy}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        {modal.kind === "employee" && (
          <>
            <p className="muted">
              Employees are OHOINDIA customers linked to your company group.
            </p>
            <div className="form-grid">
              <Field
                label="Full name"
                name="name"
                value={modal.employee?.name}
                maxLength={100}
              />
              <Field
                label="Employee ID"
                name="employeeCode"
                value={modal.employee?.employeeCode}
                maxLength={60}
              />
              <Field
                label="Work email"
                name="email"
                type="email"
                value={modal.employee?.email}
                maxLength={190}
              />
              <Field
                label="Mobile number"
                name="mobile"
                type="tel"
                pattern="[6-9][0-9]{9}"
                value={modal.employee?.mobile}
                readOnly={!!modal.employee}
                maxLength={10}
              />
              <Field
                label="Department"
                name="department"
                value={modal.employee?.department}
                maxLength={100}
              />
              <Field
                label="Joining date"
                name="joinedOn"
                type="date"
                value={modal.employee?.joinedOn}
              />
              <label className="field">
                Onboarding status
                <select
                  name="status"
                  defaultValue={
                    modal.employee?.status === "Active" ? "Active" : "Pending"
                  }
                >
                  <option>Pending</option>
                  <option>Active</option>
                </select>
              </label>
            </div>
            <p className="hint">
              Pending employees can be activated after HR verifies their
              details. Existing customer records are linked by mobile number.
            </p>
          </>
        )}
        {modal.kind === "remove" && (
          <p>
            Remove <strong>{modal.employee.name}</strong> from the company
            roster? Their OHOINDIA customer account and history will be
            retained. Assigned company inventory will be released. This cannot
            be undone in the portal.
          </p>
        )}
        {modal.kind === "inventory" && (
          <div className="form-grid">
            <Field label="Item name" name="name" maxLength={120} />
            <Field label="SKU / reference" name="sku" maxLength={60} />
            <Field label="Total units" name="quantity" type="number" min={1} />
          </div>
        )}
        {modal.kind === "assign" && (
          <>
            <p>
              Assign one unit of <strong>{modal.item.name}</strong>.{" "}
              {Number(modal.item.quantity) - Number(modal.item.assigned)}{" "}
              available.
            </p>
            <label className="field">
              Active employee
              <select name="employeeId" required defaultValue="">
                <option value="" disabled>
                  Select an employee
                </option>
                {data.employees
                  .filter((e) => e.status === "Active")
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} · {e.employeeCode}
                    </option>
                  ))}
              </select>
            </label>
          </>
        )}
        {modal.kind === "role" && (
          <>
            <Field label="Role name" name="name" maxLength={60} />
            <fieldset>
              <legend>Permissions</legend>
              <p className="hint">
                Every role can view the company employee directory and activity.
              </p>
              {allPermissions.map((permission) => (
                <label className="check" key={permission}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={permission}
                  />
                  <span>
                    {
                      {
                        employees: "Add, edit and remove employees",
                        inventory: "Manage and assign inventory",
                        invoices: "View and export invoices",
                        access: "Create roles and manage portal access",
                      }[permission]
                    }
                  </span>
                </label>
              ))}
            </fieldset>
          </>
        )}
        {modal.kind === "user" && (
          <div className="form-grid">
            <Field
              label="Name"
              name="name"
              value={modal.user?.name}
              maxLength={120}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              value={modal.user?.email}
              maxLength={190}
            />
            <label className="field">
              {modal.user ? "New password (optional)" : "Password"}
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required={!modal.user}
              />
              <small>At least 12 characters. Share securely.</small>
            </label>
            <label className="field">
              Role
              <select
                name="roleId"
                required
                defaultValue={modal.user?.roleId ?? ""}
              >
                <option disabled value="">
                  Choose a role
                </option>
                {data.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Access status
              <select
                name="status"
                defaultValue={modal.user?.status ?? "Active"}
              >
                <option>Active</option>
                <option>Disabled</option>
              </select>
            </label>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="secondary"
            onClick={close}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className={modal.kind === "remove" ? "danger" : "primary"}
            disabled={busy}
          >
            {busy
              ? "Saving…"
              : modal.kind === "remove"
                ? "Remove employee"
                : "Save changes"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
export default function Portal() {
  const [data, setData] = useState<Workspace | null>(null);
  const [section, setSection] = useState<Section>("Overview");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modal, setModal] = useState<Modal | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const endSession = () => {
      setData(null);
      setModal(null);
      setError("Your corporate session has ended. Please sign in again.");
      setSection("Overview");
    };
    window.addEventListener("oho-corporate-session-ended", endSession);
    return () =>
      window.removeEventListener("oho-corporate-session-ended", endSession);
  }, []);
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      setData(await request<Workspace>("workspace"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to sign in. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setData(await request<Workspace>("workspace"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh.");
    } finally {
      setBusy(false);
    }
  }
  async function save(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setModalError("");
    try {
      await request(path, body);
      setModal(null);
      setNotice("Changes saved successfully.");
      try {
        setData(await request<Workspace>("workspace"));
      } catch {
        setError(
          "Your changes were saved. Refresh to load the updated workspace.",
        );
      }
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Unable to save changes.");
    } finally {
      setBusy(false);
    }
  }
  function open(value: Modal) {
    setModalError("");
    setModal(value);
  }
  function navigate(value: Section) {
    setSection(value);
    setSearch("");
    setFilter("All");
    setMenu(false);
    setNotice("");
  }
  async function signOut() {
    setBusy(true);
    try {
      await logout();
      setData(null);
      setError("");
      setSection("Overview");
    } catch {
      setError(
        "Signed out on this device. The server could not confirm session revocation.",
      );
    } finally {
      setData(null);
      setModal(null);
      setBusy(false);
    }
  }
  if (!data)
    return (
      <div className="corporate login-page">
        <section className="login-story">
          <Brand />
          <div>
            <span className="eyebrow">BETTER CARE. TOGETHER.</span>
            <h1>
              A healthier team.
              <br />A stronger company.
            </h1>
            <p>
              Your people, their onboarding, and your OHOINDIA services — in one
              company workspace.
            </p>
            <div className="story-line">
              <span>01</span> Connect your people
            </div>
            <div className="story-line">
              <span>02</span> Manage company benefits
            </div>
            <div className="story-line">
              <span>03</span> Stay on top of every detail
            </div>
          </div>
          <small>OHOINDIA · Employee care, made simple.</small>
        </section>
        <main className="login-main">
          <form className="login-card" onSubmit={signIn}>
            <span className="eyebrow">YOUR COMPANY WORKSPACE</span>
            <h2>Welcome back</h2>
            <p className="muted">
              Sign in with the corporate account provided by OHOINDIA or your
              company administrator.
            </p>
            <label className="field">
              Work email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="you@company.com"
              />
            </label>
            <label className="field">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={12}
                maxLength={128}
                placeholder="Enter your password"
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary login-submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to your workspace →"}
            </button>
            <p className="hint">
              Need access or a password reset? Contact your company
              administrator or OHOINDIA. Access is provisioned for your
              company’s existing Group.
            </p>
          </form>
          <small className="login-footer">
            CORPORATE.OHOINDIALIFE.COM · COMPANY ACCESS
          </small>
        </main>
      </div>
    );
  const can = (p: Permission) => data.identity.permissions.includes(p);
  const active = data.employees.filter((e) => e.status === "Active");
  const pending = data.employees.filter((e) => e.status === "Pending");
  const roster = section === "Onboarding" ? pending : data.employees;
  const employees = roster.filter(
    (e) =>
      (filter === "All" || e.status === filter) &&
      `${e.name} ${e.email} ${e.employeeCode} ${e.department} ${e.mobile}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const invoices = data.invoices.filter(
    (i) =>
      (filter === "All" || i.status === filter) &&
      `${i.number} ${i.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const outstanding = data.invoices
    .filter((i) => i.status !== "Paid")
    .reduce((sum, i) => sum + Number(i.amountPaise), 0);
  const nav: { name: Section; icon: string; permission?: Permission }[] = [
    { name: "Overview", icon: "◫" },
    { name: "Employees", icon: "♙" },
    { name: "Onboarding", icon: "⊕", permission: "employees" },
    { name: "Invoices", icon: "▤", permission: "invoices" },
    { name: "Inventory", icon: "◇", permission: "inventory" },
    { name: "Roles & access", icon: "⚿", permission: "access" },
  ];
  const employeeTable = (
    <>
      {!employees.length ? (
        <Empty text="Add an employee or adjust your search and filters." />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Joined</th>
                <th>Status</th>
                {can("employees") && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="person">
                      <span className="avatar">{e.name.slice(0, 1)}</span>
                      <div>
                        <strong>{e.name}</strong>
                        <small>{e.email}</small>
                        <small>+91 {e.mobile}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {e.employeeCode}
                    <small className="cell-sub">
                      OHO #{e.communityCustomerId}
                    </small>
                  </td>
                  <td>{e.department || "—"}</td>
                  <td>{date(e.joinedOn)}</td>
                  <td>
                    <Badge>{e.status}</Badge>
                  </td>
                  {can("employees") && (
                    <td>
                      {e.status === "Removed" ? (
                        <button
                          className="text-button"
                          onClick={() =>
                            open({ kind: "employee", employee: e })
                          }
                        >
                          Re-onboard
                        </button>
                      ) : (
                        <div className="row-actions">
                          <button
                            className="text-button"
                            onClick={() =>
                              open({ kind: "employee", employee: e })
                            }
                          >
                            Edit
                          </button>
                          <button
                            className="text-button remove"
                            onClick={() =>
                              open({ kind: "remove", employee: e })
                            }
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
  return (
    <div className="corporate portal-shell">
      <aside className={`sidebar ${menu ? "expanded" : ""}`}>
        <Brand />
        <div className="company-label">
          <span className="company-avatar">{data.company.name[0]}</span>
          <div>
            <strong>{data.company.name}</strong>
            <small>Group #{data.company.groupId}</small>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {nav
            .filter((n) => !n.permission || can(n.permission))
            .map((n) => (
              <button
                key={n.name}
                className={section === n.name ? "selected" : ""}
                onClick={() => navigate(n.name)}
                aria-current={section === n.name ? "page" : undefined}
              >
                <span aria-hidden="true">{n.icon}</span>
                {n.name}
                {n.name === "Onboarding" && pending.length > 0 && (
                  <b>{pending.length}</b>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <p>Here for your people.</p>
          <small>Your OHOINDIA company workspace</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <button
              className="mobile-toggle icon-button"
              aria-label="Toggle menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              ☰
            </button>
            <span>
              Company workspace <span className="breadcrumb">/ {section}</span>
            </span>
          </div>
          <div className="profile">
            <span className="avatar small">{data.identity.name[0]}</span>
            <div>
              <strong>{data.identity.name}</strong>
              <small>{data.identity.role}</small>
            </div>
            <button className="text-button" onClick={signOut} disabled={busy}>
              Sign out
            </button>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {section === "Overview"
                  ? "PEOPLE FIRST, ALWAYS"
                  : data.company.name.toUpperCase()}
              </span>
              <h1>
                {section === "Overview" ? "Your team, at a glance" : section}
              </h1>
              <p className="muted">
                {
                  {
                    Overview:
                      "A little oversight. A lot of care for your people.",
                    Employees:
                      "Manage the people connected to your OHOINDIA company group.",
                    Onboarding:
                      "Help every new employee get off to a healthy start.",
                    Invoices: "Keep track of your company’s OHOINDIA invoices.",
                    Inventory: "Manage company stock and employee allocations.",
                    "Roles & access":
                      "Give your team the right access to this workspace.",
                  }[section]
                }
              </p>
            </div>
            <div className="heading-actions">
              <button className="secondary" onClick={refresh} disabled={busy}>
                {busy ? "Loading…" : "↻ Refresh"}
              </button>
              {can("employees") &&
                ["Overview", "Employees", "Onboarding"].includes(section) && (
                  <button
                    className="primary"
                    onClick={() => open({ kind: "employee" })}
                  >
                    ＋ Add employee
                  </button>
                )}
              {section === "Inventory" && (
                <button
                  className="primary"
                  onClick={() => open({ kind: "inventory" })}
                >
                  ＋ Add inventory
                </button>
              )}
            </div>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="success" role="status">
              {notice}
            </p>
          )}
          {section === "Overview" && (
            <>
              <div className="stats">
                <div className="stat">
                  <span>
                    Total employees <b>♙</b>
                  </span>
                  <strong>
                    {
                      data.employees.filter((e) => e.status !== "Removed")
                        .length
                    }
                  </strong>
                  <small>Connected to your company</small>
                </div>
                <div className="stat">
                  <span>
                    Active employees <b>✓</b>
                  </span>
                  <strong>{active.length}</strong>
                  <small>Onboarding completed</small>
                </div>
                <div className="stat">
                  <span>
                    Onboarding pending <b>◷</b>
                  </span>
                  <strong>{pending.length}</strong>
                  <small>Ready for HR review</small>
                </div>
                <div className="stat">
                  <span>
                    {can("invoices")
                      ? "Outstanding invoices"
                      : "Your company group"}
                    <b>▤</b>
                  </span>
                  <strong>
                    {can("invoices")
                      ? money(outstanding)
                      : `#${data.company.groupId}`}
                  </strong>
                  <small>
                    {can("invoices")
                      ? "Unpaid company invoices"
                      : "OHOINDIA community"}
                  </small>
                </div>
              </div>
              <div className="overview-grid">
                <section className="panel welcome-panel">
                  <span className="eyebrow">CARE BEGINS WITH CONNECTION</span>
                  <h2>
                    Make every employee
                    <br />
                    part of the OHOINDIA family.
                  </h2>
                  <p>
                    Bring your team together under one company group. Add
                    employees, complete onboarding, and keep their details up to
                    date.
                  </p>
                  <button
                    className="primary"
                    onClick={() =>
                      navigate(can("employees") ? "Onboarding" : "Employees")
                    }
                  >
                    {can("employees")
                      ? "Review onboarding"
                      : "View employee directory"}{" "}
                    →
                  </button>
                  <div className="welcome-art" aria-hidden="true">
                    ＋<span>♡</span>
                  </div>
                </section>
                <section className="panel checklist">
                  <h2>Workspace essentials</h2>
                  <button onClick={() => navigate("Employees")}>
                    <span className="check-icon">01</span>
                    <div>
                      <strong>Your people</strong>
                      <small>Employee directory and group membership</small>
                    </div>
                    <span>→</span>
                  </button>
                  {can("inventory") && (
                    <button onClick={() => navigate("Inventory")}>
                      <span className="check-icon">02</span>
                      <div>
                        <strong>Company inventory</strong>
                        <small>
                          {data.inventory.reduce(
                            (sum, i) =>
                              sum + Number(i.quantity) - Number(i.assigned),
                            0,
                          )}{" "}
                          units available to assign
                        </small>
                      </div>
                      <span>→</span>
                    </button>
                  )}
                  {can("access") && (
                    <button onClick={() => navigate("Roles & access")}>
                      <span className="check-icon">03</span>
                      <div>
                        <strong>Roles & permissions</strong>
                        <small>Manage HR, finance and admin access</small>
                      </div>
                      <span>→</span>
                    </button>
                  )}
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent activity</h2>
                    <p className="muted">
                      A record of changes in your company workspace.
                    </p>
                  </div>
                </div>
                {!data.activity.length ? (
                  <Empty text="Company activity will appear here." />
                ) : (
                  <div className="activity-list">
                    {data.activity.map((a, i) => (
                      <div key={i}>
                        <span className="activity-dot" />
                        <div>
                          <strong>{a.action}</strong>
                          <small>{a.actor}</small>
                        </div>
                        <time>{date(a.createdAt)}</time>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
          {["Employees", "Onboarding"].includes(section) && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    {section === "Onboarding"
                      ? "Awaiting onboarding"
                      : "Employee directory"}{" "}
                    <span className="count">{employees.length}</span>
                  </h2>
                  <p className="muted">
                    Company membership is separate from the customer account.
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() =>
                    exportCsv("employees.csv", [
                      [
                        "Name",
                        "Employee ID",
                        "Email",
                        "Mobile",
                        "Department",
                        "Joined",
                        "Status",
                      ],
                      ...employees.map((e) => [
                        e.name,
                        e.employeeCode,
                        e.email,
                        e.mobile,
                        e.department,
                        e.joinedOn,
                        e.status,
                      ]),
                    ])
                  }
                >
                  ↓ Export CSV
                </button>
              </div>
              <div className="toolbar">
                <input
                  aria-label="Search employees"
                  placeholder="Search name, employee ID, mobile or department…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {section === "Employees" && (
                  <select
                    aria-label="Filter employee status"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    {["All", "Active", "Pending", "Removed"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
              {employeeTable}
            </section>
          )}
          {section === "Invoices" && (
            <>
              <div className="invoice-summary">
                <span>
                  Outstanding balance<strong>{money(outstanding)}</strong>
                </span>
                <p>
                  Invoices are issued and maintained by OHOINDIA.
                  <br />
                  Contact OHOINDIA for billing queries or payment
                  reconciliation.
                </p>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Company invoices</h2>
                  <button
                    className="secondary"
                    onClick={() =>
                      exportCsv("invoices.csv", [
                        [
                          "Invoice",
                          "Issued",
                          "Due",
                          "Amount INR",
                          "Status",
                          "Description",
                        ],
                        ...invoices.map((i) => [
                          i.number,
                          i.issuedOn,
                          i.dueOn,
                          Number(i.amountPaise) / 100,
                          i.status,
                          i.description,
                        ]),
                      ])
                    }
                  >
                    ↓ Export CSV
                  </button>
                </div>
                <div className="toolbar">
                  <input
                    aria-label="Search invoices"
                    placeholder="Search invoices…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select
                    aria-label="Filter invoices"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    {["All", "Paid", "Due", "Overdue"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {!invoices.length ? (
                  <Empty text="Invoices issued by OHOINDIA will appear here." />
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Issued</th>
                          <th>Due date</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((i) => (
                          <tr key={i.id}>
                            <td>
                              <strong>{i.number}</strong>
                              <small className="cell-sub">
                                {i.description}
                              </small>
                            </td>
                            <td>{date(i.issuedOn)}</td>
                            <td>{date(i.dueOn)}</td>
                            <td>
                              <strong>{money(i.amountPaise)}</strong>
                            </td>
                            <td>
                              <Badge>{i.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
          {section === "Inventory" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Company inventory</h2>
                  <p className="muted">
                    Track physical stock or benefit units. Allocations do not
                    activate insurance or paid services.
                  </p>
                </div>
              </div>
              {!data.inventory.length ? (
                <Empty text="Add stock to begin allocating units to active employees." />
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>SKU</th>
                        <th>Total units</th>
                        <th>Assigned</th>
                        <th>Available</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.inventory.map((i) => (
                        <tr key={i.id}>
                          <td>
                            <strong>{i.name}</strong>
                          </td>
                          <td>{i.sku}</td>
                          <td>{i.quantity}</td>
                          <td>{i.assigned}</td>
                          <td>
                            <Badge>
                              {Number(i.quantity) - Number(i.assigned)}
                            </Badge>
                          </td>
                          <td>
                            <button
                              className="text-button"
                              disabled={
                                Number(i.assigned) >= Number(i.quantity) ||
                                !active.length
                              }
                              onClick={() => open({ kind: "assign", item: i })}
                            >
                              Assign to employee →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {section === "Roles & access" && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Company roles</h2>
                    <p className="muted">
                      All users can view the employee directory. Additional
                      permissions are granted per role.
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => open({ kind: "role" })}
                  >
                    ＋ Create role
                  </button>
                </div>
                <div className="role-grid">
                  {data.roles.map((r) => (
                    <div className="role-card" key={r.id}>
                      <h3>
                        {r.name}
                        <small>
                          {r.isSystem ? "Default role" : "Custom role"}
                        </small>
                      </h3>
                      <div>
                        {r.permissions.length ? (
                          r.permissions.map((p) => (
                            <span className="permission" key={p}>
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="permission">
                            Directory view only
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Portal users</h2>
                  <button
                    className="primary"
                    onClick={() => open({ kind: "user" })}
                  >
                    ＋ Add portal user
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name}</strong>
                            {u.id === data.identity.userId && (
                              <small className="cell-sub">You</small>
                            )}
                          </td>
                          <td>{u.email}</td>
                          <td>{u.role}</td>
                          <td>
                            <Badge>{u.status}</Badge>
                          </td>
                          <td>
                            <button
                              className="text-button"
                              disabled={u.id === data.identity.userId}
                              onClick={() => open({ kind: "user", user: u })}
                            >
                              Edit access
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          <footer className="workspace-footer">
            <span>OHOINDIA · Care for your community</span>
            <span>Company Group #{data.company.groupId}</span>
          </footer>
        </main>
      </div>
      {modal && (
        <Dialog
          modal={modal}
          data={data}
          close={() => setModal(null)}
          save={save}
          busy={busy}
          error={modalError}
        />
      )}
    </div>
  );
}
