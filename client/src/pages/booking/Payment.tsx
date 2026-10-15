import { Link, Navigate, useLocation } from "react-router-dom";
import { AppShell, PageHeader } from "../../components/Layout";
import { usePortalData, textValue } from "../portal/usePortalData";
import { translate } from "../../../../common/content/locale";

export function Payment() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const id = Number(params.get("orderId") || location.state?.orderId);
  if (Number.isSafeInteger(id) && id > 0)
    return <Navigate to={`/purchase/${id}/payment`} replace />;
  return <PendingPayments />;
}
function PendingPayments() {
  const data = usePortalData("api/purchases/pending");
  return (
    <AppShell>
      <PageHeader title={translate("Payment")} />
      {data.loading ? (
        <p role="status">{translate("Loading your purchase\u2026")}</p>
      ) : data.error ? (
        <p role="alert">
          {data.error}
          <button onClick={data.retry}>{translate("Try again")}</button>
        </p>
      ) : data.rows.length === 0 ? (
        <Link to="/packages">{translate("Browse packages")}</Link>
      ) : (
        data.rows.map((order) => (
          <Link
            className="purchase-payment-option"
            key={textValue(order, "OrdersId")}
            to={`/purchase/${textValue(order, "OrdersId")}/payment`}
          >
            {textValue(order, "ProductName")} -{" "}
            {translate("Continue to payment")}
          </Link>
        ))
      )}
    </AppShell>
  );
}
