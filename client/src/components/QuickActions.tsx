import { UI_TEXT } from "../../../common/content/labels";
import { useNavigate } from "react-router-dom";
import { DashboardIcon } from "./DashboardIcon";

export function QuickActions({
  memberId,
  communityId,
  allowService,
}: {
  memberId: number;
  communityId: number;
  allowService: () => boolean;
}) {
  const navigate = useNavigate();
  return (
    <section
      className="home-quick-actions"
      aria-labelledby="quick-actions-title"
    >
      <h2 id="quick-actions-title">{UI_TEXT.quickActions}</h2>
      <div className="home-quick-actions-grid">
        <button
          type="button"
          onClick={() => {
            if (!allowService()) return;
            navigate("/hospitallist", {
              state: {
                memberId,
                communityId,
                isFromBookService: true,
                isFromHospitalMenu: true,
              },
            });
          }}
        >
          <span className="quick-action-icon">
            <DashboardIcon name="doctor" />
          </span>
          <span>
            {UI_TEXT.zeroCash}
            <br />
            {UI_TEXT.opd}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (allowService()) navigate("/payment");
          }}
        >
          <span className="quick-action-icon">
            <DashboardIcon name="qr" />
          </span>
          <span>
            {UI_TEXT.scanPay}
            <br />
            {UI_TEXT.qr}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (allowService()) navigate("/pharmacy");
          }}
        >
          <span className="quick-action-icon">
            <DashboardIcon name="pharmacy" />
          </span>
          <span>
            {UI_TEXT.pharmacy}
            <br />
            {UI_TEXT.subsidies}
          </span>
        </button>
      </div>
    </section>
  );
}
