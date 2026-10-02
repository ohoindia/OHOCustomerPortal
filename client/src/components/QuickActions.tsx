import { useNavigate } from "react-router-dom";
import { DashboardIcon } from "./DashboardIcon";

export function QuickActions({
  memberId,
  communityId,
}: {
  memberId: number;
  communityId: number;
}) {
  const navigate = useNavigate();
  return (
    <section
      className="home-quick-actions"
      aria-labelledby="quick-actions-title"
    >
      <h2 id="quick-actions-title">Quick Actions</h2>
      <div className="home-quick-actions-grid">
        <button
          type="button"
          onClick={() =>
            navigate("/hospitallist", {
              state: {
                memberId,
                communityId,
                isFromBookService: true,
                isFromHospitalMenu: true,
              },
            })
          }
        >
          <span className="quick-action-icon">
            <DashboardIcon name="doctor" />
          </span>
          <span>
            Zero-Cash
            <br />
            OPD
          </span>
        </button>
        <button type="button" disabled onClick={() => navigate("/payment")}>
          <span className="quick-action-icon">
            <DashboardIcon name="qr" />
          </span>
          <span>
            Scan &amp; Pay
            <br />
            QR
          </span>
        </button>
        <button type="button" onClick={() => navigate("/pharmacy")}>
          <span className="quick-action-icon">
            <DashboardIcon name="pharmacy" />
          </span>
          <span>
            Pharmacy
            <br />
            Subsidies
          </span>
        </button>
      </div>
    </section>
  );
}
