import { UI_TEXT } from "../../../../common/content/labels";
import { capitalizeName } from "../../../../common/utils/names";
import { useNavigate } from "react-router-dom";
import { Settings } from "../../components/Icons";
import { AppShell } from "../../components/Layout";
import { MenuRow } from "../../components/Cards";
import { translate } from "../../../../common/content/locale";
import { clearSession } from "../auth/logout";
import { getSessionMember } from "../auth/member";

export function Profile() {
  const nav = useNavigate();
  const member = getSessionMember();
  const name = capitalizeName(member?.Name?.trim() || UI_TEXT.myProfile);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <AppShell className="profile-page">
      <section className="profile-hero">
        <div className="profile-photo">{initials}</div>
        <div>
          <h2>{name}</h2>
          <p>{member?.MobileNumber || UI_TEXT.mobileNumberNotProvided}</p>
        </div>
        <Settings />
      </section>
      <div className="menu-list">
        <MenuRow
          icon={"\u{1F310}"}
          title={translate("Change Language")}
          subtitle={translate("Choose your language")}
          onClick={() => nav("/language")}
        />
        <MenuRow
          icon={UI_TEXT.familyIcon}
          title={UI_TEXT.myFamily}
          subtitle={UI_TEXT.manageFamilyMembers}
          onClick={() => nav("/family")}
        />
        {/* <MenuRow
          icon={UI_TEXT.recordsEmoji}
          title={UI_TEXT.myHealthRecords}
          subtitle={UI_TEXT.viewReportsPrescriptions}
          onClick={() => nav("/records")}
        /> */}
        <MenuRow
          icon={UI_TEXT.medalEmoji}
          title={UI_TEXT.membership}
          subtitle={UI_TEXT.goldWellnessCard}
          onClick={() => nav("/account-details")}
        />
        <MenuRow
          icon={UI_TEXT.purseEmoji}
          title={UI_TEXT.walletRewards}
          subtitle={UI_TEXT.cashbackOffersCoupons}
          onClick={() => nav("/wallet")}
        />
        {/* <MenuRow
          icon={UI_TEXT.paymentCardEmoji}
          title={UI_TEXT.paymentMethods}
          subtitle={UI_TEXT.cardsUpiWallets}
        /> */}
        {/* <MenuRow
          icon={UI_TEXT.supportEmoji}
          title={UI_TEXT.support2}
          subtitle={UI_TEXT.helpSupport2}
        />
        <MenuRow
          icon={UI_TEXT.moreIcon}
          title={UI_TEXT.moreServices}
          subtitle={UI_TEXT.membershipKycHospitalNetworkWellness}
          onClick={() => nav("/menu")}
        /> */}
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
