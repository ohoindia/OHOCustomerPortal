import { membershipBenefits } from "../../../../common/content/options";
import { UI_TEXT } from "../../../../common/content/labels";
import { AppShell, PageHeader } from "../../components/Layout";

function LogoMini() {
  return <div className="logo-mini">{UI_TEXT.oho}</div>;
}

export function Membership() {
  return (
    <AppShell>
      <PageHeader title={UI_TEXT.membership} />
      <section className="membership-detail">
        <LogoMini />
        <span>{UI_TEXT.gold}</span>
        <h2>{UI_TEXT.ohoGoldWellnessCard}</h2>
        <p>{UI_TEXT.cardNo280400015854}</p>
        <p>{UI_TEXT.validTill20Dec2026}</p>
      </section>
      <h3>{UI_TEXT.membershipBenefits}</h3>
      {membershipBenefits.map((x) => (
        <div className="benefit" key={x}>
          {UI_TEXT.checkmarkPrefix}
          {x}
        </div>
      ))}
    </AppShell>
  );
}
