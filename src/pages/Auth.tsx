import { useNavigate } from "react-router-dom";
import { Logo, PrimaryButton } from "../components/Layout";

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

export function Login() {
  const navigate = useNavigate();
  return (
    <main className="auth-page">
      <Logo compact />
      <section className="auth-card">
        <h1>Welcome Back!</h1>
        <p>Please login to continue</p>
        <label className="phone-input">
          <span>☎</span>
          <b>+91</b>
          <input placeholder="Enter Mobile Number" defaultValue="9876543210" />
        </label>
        <PrimaryButton onClick={() => navigate("/otp")}>Continue</PrimaryButton>
        <div className="divider">or</div>
        <button className="social-btn">🌈 Continue with Google</button>
        <button className="social-btn">● Continue with Apple</button>
      </section>
      <p>
        New to OHO? <b>Sign Up</b>
      </p>
    </main>
  );
}

export function OTP() {
  const navigate = useNavigate();
  const digits = ["2", "4", "7", "8", "1", "6"];
  return (
    <main className="auth-page otp-page">
      <section className="auth-card wide">
        <h1>Verify OTP</h1>
        <p>
          We have sent a 6 digit OTP to
          <br />
          <b>+91 98765 43210</b>
        </p>
        <div className="otp-boxes">
          {digits.map((d, i) => (
            <input key={i} value={d} readOnly />
          ))}
        </div>
        <p>
          Resend OTP in <b>00:25</b>
        </p>
        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((n, i) => (
            <button key={i}>{n}</button>
          ))}
        </div>
        <PrimaryButton onClick={() => navigate("/")}>
          Verify & Continue
        </PrimaryButton>
      </section>
    </main>
  );
}
