import { UI_TEXT } from "../../../../common/content/labels";
import { useNavigate } from "react-router-dom";
import { Settings } from "../../components/Icons";
import { AppShell } from "../../components/Layout";
import { MenuRow } from "../../components/Cards";
import { clearSession } from "../auth/logout";
import { getSessionMember } from "../auth/member";
import { textValue, usePortalData } from "../portal/usePortalData";

export function Profile() {
  const nav = useNavigate();
  const member = getSessionMember();
  const name = member?.Name?.trim() || UI_TEXT.myProfile;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <AppShell>
      <section className="profile-hero">
        <div className="profile-photo">{initials}</div>
        <div>
          <h2>{name}</h2>
          <p>{member?.MobileNumber || UI_TEXT.mobileNumberNotProvided}</p>
        </div>
        <Settings />
      </section>
      {Number(member?.MemberId) > 0 && (
        <ProfileFamily id={Number(member?.MemberId)} />
      )}
      <div className="menu-list">
        <MenuRow
          icon={UI_TEXT.familyIcon}
          title={UI_TEXT.myFamily}
          subtitle={UI_TEXT.manageFamilyMembers}
          onClick={() => nav("/family")}
        />
        <MenuRow
          icon={UI_TEXT.recordsEmoji}
          title={UI_TEXT.myHealthRecords}
          subtitle={UI_TEXT.viewReportsPrescriptions}
          onClick={() => nav("/records")}
        />
        <MenuRow
          icon={UI_TEXT.medalEmoji}
          title={UI_TEXT.membership}
          subtitle={UI_TEXT.goldWellnessCard}
          onClick={() => nav("/membership")}
        />
        <MenuRow
          icon={UI_TEXT.purseEmoji}
          title={UI_TEXT.walletRewards}
          subtitle={UI_TEXT.cashbackOffersCoupons}
          onClick={() => nav("/wallet")}
        />
        <MenuRow
          icon={UI_TEXT.paymentCardEmoji}
          title={UI_TEXT.paymentMethods}
          subtitle={UI_TEXT.cardsUpiWallets}
        />
        <MenuRow
          icon={UI_TEXT.supportEmoji}
          title={UI_TEXT.support2}
          subtitle={UI_TEXT.helpSupport2}
        />
        <MenuRow
          icon={UI_TEXT.moreIcon}
          title={UI_TEXT.moreServices}
          subtitle={UI_TEXT.membershipKycHospitalNetworkWellness}
          onClick={() => nav("/menu")}
        />
      </div>
      <MenuRow
        icon={UI_TEXT.logoutIcon}
        title={UI_TEXT.logout}
        subtitle={UI_TEXT.signOutOfYourAccount}
        onClick={() => {
          clearSession();
          nav("/login", { replace: true });
        }}
      />
    </AppShell>
  );
}

function ProfileFamily({ id }: { id: number }) {
  const data = usePortalData(`api/Customer/GetDependentsByCustomerId/${id}`);
  return (
    <section aria-labelledby="profile-family-title">
      <h2 id="profile-family-title">{UI_TEXT.familyDetails}</h2>
      {data.loading && <p role="status">{UI_TEXT.loadingFamilyDetails}</p>}
      {data.error && (
        <div role="alert">
          <p>{data.error}</p>
          <button className="outline-btn" onClick={data.retry}>
            {UI_TEXT.tryAgain}
          </button>
        </div>
      )}
      {data.rows.map((row) => (
        <article className="family-row" key={textValue(row, "CustomerId")}>
          <div>
            <b>{textValue(row, "Name") || UI_TEXT.nameNotProvided}</b>
            <small>
              {textValue(row, "Relationship") || UI_TEXT.familyMember}
            </small>
            <small>
              {[
                textValue(row, "Gender"),
                textValue(row, "DateofBirth").split("T")[0],
              ]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </div>
        </article>
      ))}
      {!data.loading && !data.error && !data.rows.length && (
        <p>{UI_TEXT.noFamilyMembersHaveBeenAdded}</p>
      )}
    </section>
  );
}
