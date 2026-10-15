import { useEffect, useMemo, useRef, useState } from "react";
import type { Workspace } from "./api";
import { request } from "./api";
import {
  compatibleSheet,
  importRequestId,
  parseEmployees,
} from "./excelImport";
import type { Cell, ImportEmployee } from "./excelImport";

type Result = {
  state: "Saved" | "Review" | "Failed" | "Processing";
  message: string;
  orderId?: number;
};
export function ExcelImportDialog({
  data,
  close,
  onComplete,
}: {
  data: Workspace;
  close: () => void;
  onComplete: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const stop = useRef(false);
  const [sheets, setSheets] = useState<{ sheet: string; data: Cell[][] }[]>([]);
  const [sheet, setSheet] = useState("");
  const [fileName, setFileName] = useState("");
  const [dayFirst, setDayFirst] = useState(true);
  const [productId, setProductId] = useState(
    data.products.length === 1 ? String(data.products[0].id) : "",
  );
  const [joinedOn, setJoinedOn] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const [status, setStatus] = useState("Active");
  const [busy, setBusy] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Record<number, Result>>({});
  const [nominees, setNominees] = useState<
    Record<string, { familyIndex: number; guardianIndex: number }>
  >({});
  const selected = sheets.find((s) => s.sheet === sheet);
  const parsed = useMemo(() => {
    if (!selected)
      return { employees: [] as ImportEmployee[], errors: [] as string[] };
    try {
      return parseEmployees(selected.data, dayFirst);
    } catch (e) {
      return {
        employees: [],
        errors: [e instanceof Error ? e.message : "Unable to parse sheet"],
      };
    }
  }, [selected, dayFirst]);
  const product = data.products.find((p) => p.id === Number(productId));
  const issues = [...parsed.errors];
  for (const e of parsed.employees) {
    if (product && e.family.length > Math.max(0, product.maximumMembers - 1))
      issues.push(
        `Row ${e.row}: ${product.name} allows ${Math.max(0, product.maximumMembers - 1)} family members.`,
      );
    if (
      product?.requiresSpouse &&
      !e.family.some((p) => p.relationship === "Spouse")
    )
      issues.push(`Row ${e.row}: this product requires a spouse.`);
    for (const n of product?.nominees ?? [])
      if (!nominees[`${e.row}-${n.id}`])
        issues.push(`Row ${e.row}: select a nominee for ${n.name}.`);
  }
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    setSheets([]);
    setSheet("");
    setNominees({});
    setResults({});
    if (
      !file.name.toLowerCase().endsWith(".xlsx") ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose an .xlsx file up to 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const { default: readExcelFile } =
        await import("read-excel-file/browser");
      const workbook = await readExcelFile(file);
      const matching = workbook.filter((s) =>
        compatibleSheet(s.data as Cell[][]),
      ) as { sheet: string; data: Cell[][] }[];
      if (!matching.length)
        throw Error(
          "No sheet matches extra1.xlsx. Required columns: Sno, FullName, Gender, DateofBirth, MobileNumber, CardHolder Type, Relationship.",
        );
      setSheets(matching);
      setSheet(matching[0].sheet);
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to read workbook.");
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    if (!product || issues.length || !parsed.employees.length || !joinedOn)
      return;
    setBusy(true);
    setFrozen(true);
    setError("");
    stop.current = false;
    try {
      for (const employee of parsed.employees) {
        if (stop.current) break;
        if (results[employee.row] && results[employee.row].state !== "Failed")
          continue;
        const { row, sno, ...fields } = employee;
        void sno;
        const body = {
          ...fields,
          productsId: product.id,
          joinedOn,
          status,
          nominees: product.nominees.map((n) => ({
            productsId: n.id,
            ...nominees[`${row}-${n.id}`],
          })),
        };
        const requestId = await importRequestId(data.company.id, sheet, body);
        try {
          const response = await request<{
            orderId: number;
            onboardingStatus: string;
            message: string;
          }>("employees/save", { ...body, requestId });
          setResults((r) => ({
            ...r,
            [row]: {
              state:
                response.onboardingStatus === "Review"
                  ? "Review"
                  : response.onboardingStatus === "Completed"
                    ? "Saved"
                    : "Processing",
              message: response.message,
              orderId: response.orderId,
            },
          }));
        } catch (e) {
          const message = e instanceof Error ? e.message : "Import failed";
          setResults((r) => ({ ...r, [row]: { state: "Failed", message } }));
          if (/session|sign in|expired|role does not/i.test(message)) {
            stop.current = true;
            setError(message);
          }
        }
        // Keep sequential requests under the corporate API's per-IP rate limits.
        if (!stop.current)
          await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to continue import.");
    } finally {
      setBusy(false);
      onComplete();
    }
  }
  const saved = Object.values(results).filter(
    (r) => r.state !== "Failed",
  ).length;
  return (
    <dialog
      ref={ref}
      className="portal-dialog excel-import-dialog"
      aria-labelledby="excel-import-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="dialog-head">
        <div>
          <span className="eyebrow">BULK ONBOARDING</span>
          <h2 id="excel-import-title">Upload employee Excel</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close Excel upload"
          disabled={busy}
          onClick={close}
        >
          ×
        </button>
      </div>
      <p>
        Use the extra1.xlsx layout. A Sno/Primary row starts an employee; the
        following rows are their family. Spouse becomes Secondary, other
        relatives become Family. Only matching worksheets are offered.
      </p>
      <div className="form-grid">
        <label className="field">
          Excel workbook
          <input
            type="file"
            accept=".xlsx"
            disabled={busy || frozen}
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </label>
        <label className="field">
          Worksheet
          <select
            value={sheet}
            disabled={busy || frozen || !sheets.length}
            onChange={(e) => {
              setSheet(e.target.value);
              setNominees({});
            }}
          >
            <option value="">Select worksheet</option>
            {sheets.map((s) => (
              <option key={s.sheet}>{s.sheet}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Company Group product
          <select
            value={productId}
            disabled={busy || frozen}
            onChange={(e) => {
              setProductId(e.target.value);
              setNominees({});
            }}
          >
            <option value="">Select a Group product</option>
            {data.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Joining date
          <input
            type="date"
            value={joinedOn}
            disabled={busy || frozen}
            onChange={(e) => setJoinedOn(e.target.value)}
          />
        </label>
        <label className="field">
          Roster status
          <select
            value={status}
            disabled={busy || frozen}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Active</option>
            <option>Pending</option>
          </select>
        </label>
        <label className="field">
          Text date format
          <select
            value={dayFirst ? "day" : "month"}
            disabled={busy || frozen}
            onChange={(e) => setDayFirst(e.target.value === "day")}
          >
            <option value="day">DD/MM/YYYY</option>
            <option value="month">MM/DD/YYYY</option>
          </select>
        </label>
      </div>
      <p className="hint">
        The chosen Group product applies to every imported person, including
        inactive products attached to the Group. Spreadsheet ProductsId values
        are ignored. Missing EmployeeCode becomes EMP-mobile; email and
        department may be blank. Address and PaidAmount values are saved to
        orders as supplied.
      </p>
      {!data.products.length && (
        <p className="error">
          Attach a product to this company Group before importing.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {parsed.employees.length > 0 && (
        <p role="status">
          {fileName}: {parsed.employees.length} employees,{" "}
          {parsed.employees.reduce((sum, e) => sum + e.family.length, 0)} family
          members. {Object.keys(results).length} processed; {saved} saved.
        </p>
      )}
      {parsed.employees.map((e) => (
        <details
          className="import-employee"
          key={e.row}
          open={product?.nominees.length ? true : undefined}
        >
          <summary>
            <strong>{e.name}</strong> · {e.employeeCode} · {e.family.length}{" "}
            family · {results[e.row]?.state ?? "Ready for preview"}
          </summary>
          <p>
            Row {e.row} · Primary · {e.mobile} · {e.dateofBirth} · {e.gender}
            {e.ohoCardNumber
              ? ` · Card ${e.ohoCardNumber}`
              : " · Generate card"}
          </p>
          {e.orderDetails.paidAmount != null && <p className="hint">Declared PaidAmount: ₹{e.orderDetails.paidAmount.toFixed(2)}</p>}
          {e.orderDetails.addressLine1 && <p className="hint">Address: {[e.orderDetails.addressLine1,e.orderDetails.addressLine2,e.orderDetails.village,e.orderDetails.mandal,e.orderDetails.city,e.orderDetails.district,e.orderDetails.state,e.orderDetails.pinCode].filter(Boolean).join(", ")}</p>}
          {e.family.map((p, i) => (
            <p className="hint" key={i}>
              {p.fullName} · {p.relationship} · {p.cardHolderType} ·{" "}
              {p.dateofBirth}
            </p>
          ))}
          {product?.nominees.map((n) => {
            const key = `${e.row}-${n.id}`;
            const selection = nominees[key];
            return (
              <div className="form-grid" key={key}>
                <label className="field">
                  Nominee for {n.name}
                  <select
                    disabled={busy || frozen}
                    value={selection?.familyIndex ?? ""}
                    onChange={(event) =>
                      setNominees((v) => ({
                        ...v,
                        [key]: {
                          familyIndex: Number(event.target.value),
                          guardianIndex: selection?.guardianIndex ?? -1,
                        },
                      }))
                    }
                  >
                    <option value="" disabled>
                      Select family nominee
                    </option>
                    {e.family.map((p, i) => (
                      <option key={i} value={i}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Guardian for minor nominee
                  <select
                    disabled={busy || frozen}
                    value={selection?.guardianIndex ?? -1}
                    onChange={(event) => {
                      if (selection)
                        setNominees((v) => ({
                          ...v,
                          [key]: {
                            ...selection,
                            guardianIndex: Number(event.target.value),
                          },
                        }));
                    }}
                  >
                    <option value={-1}>{e.name} (employee)</option>
                    {e.family.map((p, i) => (
                      <option key={i} value={i}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
          {results[e.row] && (
            <p role="status">
              {results[e.row].orderId
                ? `Order #${results[e.row].orderId}: `
                : ""}
              {results[e.row].message}
            </p>
          )}
        </details>
      ))}
      {issues.length > 0 && (
        <div className="error" role="alert">
          <strong>Resolve before importing</strong>
          <ul>
            {issues.slice(0, 50).map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
          {issues.length > 50 && <p>{issues.length - 50} more issues.</p>}
        </div>
      )}
      <p className="hint">
        Employees are imported one at a time. A failed employee does not undo
        earlier successful employees. Re-uploading the same sheet with the same
        settings resumes saved requests. Card requests in Review or Processing
        are not reissued.
      </p>
      <div className="dialog-actions">
        <button className="secondary" disabled={busy} onClick={close}>
          Close
        </button>
        {busy && frozen ? (
          <button
            className="secondary"
            onClick={() => {
              stop.current = true;
            }}
          >
            Stop after current employee
          </button>
        ) : (
          <button
            className="primary"
            disabled={
              busy ||
              !product ||
              !joinedOn ||
              issues.length > 0 ||
              !parsed.employees.length ||
              (Object.keys(results).length === parsed.employees.length &&
                !Object.values(results).some((r) => r.state === "Failed"))
            }
            onClick={() => void start()}
          >
            {frozen ? "Retry failed employees" : "Import employees"}
          </button>
        )}
      </div>
    </dialog>
  );
}
