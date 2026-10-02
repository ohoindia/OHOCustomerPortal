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
  const name = member?.Name?.trim() || "My Profile";
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
          <p>{member?.MobileNumber || "Mobile number not provided"}</p>
        </div>
        <Settings />
      </section>
      {Number(member?.MemberId) > 0 && (
        <ProfileFamily id={Number(member?.MemberId)} />
      )}
      <div className="menu-list">
        <MenuRow
          icon="👨‍👩‍👧"
          title="My Family"
          subtitle="Manage family members"
          onClick={() => nav("/family")}
        />
        <MenuRow
          icon="📋"
          title="My Health Records"
          subtitle="View reports & prescriptions"
          onClick={() => nav("/records")}
        />
        <MenuRow
          icon="🏅"
          title="Membership"
          subtitle="Gold Wellness Card"
          onClick={() => nav("/membership")}
        />
        <MenuRow
          icon="👛"
          title="Wallet & Rewards"
          subtitle="Cashback, offers & coupons"
          onClick={() => nav("/wallet")}
        />
        <MenuRow
          icon="💳"
          title="Payment Methods"
          subtitle="Cards, UPI & wallets"
        />
        <MenuRow icon="🎧" title="Support" subtitle="Help & support" />
        <MenuRow
          icon="•••"
          title="More Services"
          subtitle="Membership, KYC, hospital network & wellness"
          onClick={() => nav("/menu")}
        />
      </div>
      <MenuRow
        icon="↪"
        title="Logout"
        subtitle="Sign out of your account"
        onClick={() => {
          clearSession();
          window.location.replace("/login");
        }}
      />
    </AppShell>
  );
}

function ProfileFamily({ id }: { id: number }) {
  const data = usePortalData(`api/Customer/GetDependentsByCustomerId/${id}`);
  return (
    <section aria-labelledby="profile-family-title">
      <h2 id="profile-family-title">Family details</h2>
      {data.loading && <p role="status">Loading family details...</p>}
      {data.error && (
        <div role="alert">
          <p>{data.error}</p>
          <button className="outline-btn" onClick={data.retry}>
            Try again
          </button>
        </div>
      )}
      {data.rows.map((row) => (
        <article className="family-row" key={textValue(row, "CustomerId")}>
          <div>
            <b>{textValue(row, "Name") || "Name not provided"}</b>
            <small>{textValue(row, "Relationship") || "Family member"}</small>
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
        <p>No family members have been added.</p>
      )}
    </section>
  );
}
