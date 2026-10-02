import { otpKeypad } from "../../../common/content/options";
import { UI_TEXT } from "../../../common/content/labels";
import { useNavigate } from "react-router-dom";
import { Logo, PrimaryButton } from "../components/Layout";

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

export function Login() {
  const navigate = useNavigate();
  return (
    <main className="auth-page">
      <Logo compact />
      <section className="auth-card">
        <h1>{UI_TEXT.welcomeBack}</h1>
        <p>{UI_TEXT.pleaseLoginToContinue}</p>
        <label className="phone-input">
          <span>{UI_TEXT.phoneIcon}</span>
          <b>{UI_TEXT.value91}</b>
          <input
            placeholder={UI_TEXT.enterMobileNumber2}
            defaultValue="9876543210"
          />
        </label>
        <PrimaryButton onClick={() => navigate("/otp")}>
          {UI_TEXT.continue}
        </PrimaryButton>
        <div className="divider">{UI_TEXT.or}</div>
        <button className="social-btn">{UI_TEXT.continueWithGoogle}</button>
        <button className="social-btn">{UI_TEXT.continueWithApple}</button>
      </section>
      <p>
        {UI_TEXT.newToOho}
        <b>{UI_TEXT.signUp}</b>
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
        <h1>{UI_TEXT.verifyOtp}</h1>
        <p>
          {UI_TEXT.weHaveSentA6DigitOtpTo}
          <br />
          <b>{UI_TEXT.value919876543210}</b>
        </p>
        <div className="otp-boxes">
          {digits.map((d, i) => (
            <input key={i} value={d} readOnly />
          ))}
        </div>
        <p>
          {UI_TEXT.resendOtpIn}
          <b>{UI_TEXT.value0025}</b>
        </p>
        <div className="keypad">
          {otpKeypad.map((n, i) => (
            <button key={i}>{n}</button>
          ))}
        </div>
        <PrimaryButton onClick={() => navigate("/home")}>
          {UI_TEXT.verifyContinue}
        </PrimaryButton>
      </section>
    </main>
  );
}
