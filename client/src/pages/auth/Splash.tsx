import { UI_TEXT } from "../../../../common/content/labels";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/Layout";

export function Splash() {
  const navigate = useNavigate();
  return (
    <main className="auth-page splash" onClick={() => navigate("/login")}>
      <Logo />
      <h2>
        {UI_TEXT.yourHealth}
        <br />
        {UI_TEXT.ourPriority}
      </h2>
      <div className="hero-illustration">
        {UI_TEXT.familyIcon}
        <span>{UI_TEXT.shieldIcon}</span>
      </div>
      <p>{UI_TEXT.tapAnywhereToContinue}</p>
    </main>
  );
}
