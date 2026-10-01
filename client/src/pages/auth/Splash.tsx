import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/Layout";

export function Splash() {
  const navigate = useNavigate();
  return (
    <main className="auth-page splash" onClick={() => navigate("/login")}>
      <Logo />
      <h2>
        Your Health.
        <br />
        Our Priority.
      </h2>
      <div className="hero-illustration">
        👨‍👩‍👧<span>🛡️</span>
      </div>
      <p>Tap anywhere to continue</p>
    </main>
  );
}
