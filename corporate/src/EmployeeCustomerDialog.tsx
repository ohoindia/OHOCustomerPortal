import { useEffect, useRef, useState } from "react";
import type { Employee, EmployeeCustomer } from "./api";
import { request } from "./api";

const displayDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
    : "—";
export function EmployeeCustomerDialog({
  employee,
  close,
  canProvision,
}: {
  employee: Employee;
  close: () => void;
  canProvision: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [details, setDetails] = useState<EmployeeCustomer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    let active = true;
    request<EmployeeCustomer>("employees/customer", { id: employee.id })
      .then((result) => {
        if (active) setDetails(result);
      })
      .catch((e: unknown) => {
        if (active)
          setError(e instanceof Error ? e.message : "Unable to load customer.");
      });
    return () => {
      active = false;
      dialog.close();
    };
  }, [employee.id]);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      if (
        canProvision &&
        employee.status !== "Removed" &&
        details?.onboarding &&
        details.onboarding.status !== "Completed"
      ) {
        const result = await request<{ message: string }>(
          "employees/provision",
          { id: employee.id },
        );
        setMessage(result.message);
      }
      setDetails(
        await request<EmployeeCustomer>("employees/customer", {
          id: employee.id,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh customer.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="portal-dialog"
      aria-labelledby="customer-title"
      onCancel={close}
    >
      <div className="dialog-head">
        <div>
          <span className="eyebrow">CUSTOMER PROFILE</span>
          <h2 id="customer-title">{employee.name}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close customer profile"
          onClick={close}
        >
          ×
        </button>
      </div>
      <p>
        {employee.email} · +91 {employee.mobile}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!details && !error && <p>Loading customer…</p>}
      {details && (
        <>
          <p>
            Customer #{details.customerId ?? "Not yet linked"}
            {details.onboarding && (
              <>
                {" "}
                · Order #{details.onboarding.orderId} ·{" "}
                {details.onboarding.status}
              </>
            )}
          </p>
          {details.onboarding?.status === "Review" && (
            <p className="error">
              Card creation needs OHOINDIA review. The employee and order are
              saved. Refresh checks the existing order without issuing another
              card.
            </p>
          )}
          <h3>OHO cards</h3>
          {details.cards.length ? (
            details.cards.map((card) => (
              <div className="role-card" key={card.number}>
                <strong>{card.number}</strong>
                <p>
                  {card.active ? "Active" : "Inactive"} ·{" "}
                  {displayDate(card.startDate)} – {displayDate(card.endDate)}
                </p>
              </div>
            ))
          ) : (
            <p className="muted">No card available yet.</p>
          )}
          <h3>Products & benefits</h3>
          {details.products.length ? (
            details.products.map((p) => (
              <div key={p.id}>
                <strong>{p.name}</strong>
                <p>
                  {displayDate(p.issuedOn)} – {displayDate(p.validTill)}
                </p>
              </div>
            ))
          ) : (
            <p className="muted">
              Benefits appear here after the order is completed.
            </p>
          )}
          <h3>Family members</h3>
          {details.family.length ? (
            details.family.map((p) => (
              <div key={p.id}>
                <strong>{p.name}</strong>
                <p>
                  {p.cardHolderType ? `${p.cardHolderType} · ` : ""}
                  {p.relationship} · {p.gender} · {displayDate(p.dateofBirth)}
                </p>
              </div>
            ))
          ) : (
            <p className="muted">No family members added.</p>
          )}
        </>
      )}
      <div className="dialog-actions">
        <button className="secondary" onClick={close}>
          Close
        </button>
        <button className="primary" disabled={busy} onClick={refresh}>
          {busy ? "Refreshing…" : "Refresh customer"}
        </button>
      </div>
    </dialog>
  );
}
