import { UI_TEXT, UI_MESSAGES } from "../../../../common/content/labels";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { authRequest, remainingSeconds } from "./api";
import "./login.css";
import { clearAuthSession, saveAuthSession } from "./session";

type OTPState = {
  mobileNumber: string;
  name: string;
  guid: string;
  timer: number;
  source: "registration" | "reset";
};

export function OTP() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const details = state as OTPState | null;
  const [otp, setOtp] = useState("");
  const [guid, setGuid] = useState(details?.guid ?? "");
  const [timer, setTimer] = useState(details?.timer ?? 0);
  const [resends, setResends] = useState(0);
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const interval = window.setInterval(
      () => setTimer((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(interval);
  }, []);

  if (
    !details?.mobileNumber ||
    !details.guid ||
    !["registration", "reset"].includes(details.source)
  )
    return <Navigate to="/login" replace />;
  const reset = details.source === "reset";

  async function resend() {
    if (!details || busy || timer > 0 || resends >= 5) return;
    setBusy(true);
    setError("");
    try {
      const response = await authRequest(
        reset ? "toSetNewPassword" : "checkingMobileno",
        { mobileNumber: details.mobileNumber },
      );
      if (!response.status || !response.guid)
        throw new Error(response.message || UI_TEXT.unableToResendOtp);
      setGuid(response.guid);
      setTimer(remainingSeconds(response.futureTime));
      setResends((value) => value + 1);
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : UI_TEXT.unableToResendOtp);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details || busy) return;
    setError("");
    if (!verified && !/^\d{6}$/.test(otp)) {
      setError(UI_TEXT.pleaseEnterTheComplete6DigitOtp);
      return;
    }
    if (
      verified &&
      reset &&
      (!/^\d{4}$/.test(password) || password !== confirmation)
    ) {
      setError(UI_TEXT.enterA4DigitPasswordAndMatchingConfirmation);
      return;
    }
    setBusy(true);
    try {
      if (!verified) {
        const result = await authRequest("OTPValidation", {
          mobileNumber: details.mobileNumber,
          guid,
          otpGenerated: otp,
        });
        if (!result.status)
          throw new Error(
            result.msg || result.message || UI_TEXT.otpVerificationFailed,
          );
        setVerified(true);
        if (reset) return;
      }
      if (reset) {
        const result = await authRequest("updatePassword", {
          mobileNumber: details.mobileNumber,
          password,
          guid,
          otpGenerated: otp,
        });
        if (!result.status)
          throw new Error(result.message || UI_TEXT.unableToUpdatePassword);
        clearAuthSession();
        navigate("/login", { replace: true });
      } else {
        const result = await authRequest("add", {
          cardHolderType: UI_TEXT.primary,
          mobileNumber: details.mobileNumber,
          name: details.name,
          guid,
          otpGenerated: otp,
        });
        if (!result.status || !result.data?.customerId)
          throw new Error(
            result.msg ||
              result.message ||
              UI_TEXT.customerCreationFailedPleaseTryAgain,
          );
        saveAuthSession(result, {
          MemberId: result.data.customerId,
          Name: details.name,
          MobileNumber: details.mobileNumber,
          MemberTypeId: UI_TEXT.primary,
        });
        navigate("/home", {
          replace: true,
          state: {
            mobileNumber: details.mobileNumber,
            name: details.name,
            memberId: result.data.customerId,
          },
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : UI_TEXT.somethingWentWrongPleaseTryAgain,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page login-page">
      <Link to="/login">{UI_TEXT.backToLogin}</Link>
      <section className="auth-card">
        <h1>
          {verified && reset ? UI_TEXT.setNewPassword : UI_TEXT.verifyOtp}
        </h1>
        <p>
          {verified
            ? UI_TEXT.yourMobileNumberHasBeenVerified
            : UI_MESSAGES.enterThe6DigitOtpSentTo91(
                details.mobileNumber.slice(0, 5),
                details.mobileNumber.slice(5),
              )}
        </p>
        <form onSubmit={submit} noValidate>
          {verified && reset ? (
            <>
              <label htmlFor="new-password">{UI_TEXT.new4DigitPassword}</label>
              <div className="phone-input">
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  inputMode="numeric"
                  maxLength={4}
                  value={password}
                  disabled={busy}
                  onChange={(event) =>
                    setPassword(event.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
              <label htmlFor="confirm-password">
                {UI_TEXT.confirmPassword}
              </label>
              <div className="phone-input">
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmation}
                  disabled={busy}
                  onChange={(event) =>
                    setConfirmation(event.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
            </>
          ) : (
            !verified && (
              <>
                <label htmlFor="otp">{UI_TEXT.otp}</label>
                <div className="phone-input">
                  <input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    disabled={busy}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, ""))
                    }
                  />
                </div>
                <button
                  className="text-btn login-forgot"
                  type="button"
                  disabled={busy || timer > 0 || resends >= 5}
                  onClick={() => void resend()}
                >
                  {timer > 0
                    ? UI_MESSAGES.resendOtpInS(timer)
                    : resends >= 5
                      ? UI_TEXT.maximumResendLimitReached
                      : UI_TEXT.resendOtp}
                </button>
              </>
            )
          )}
          {error && (
            <p role="alert" className="login-error">
              {error}
            </p>
          )}
          <button className="primary-btn" disabled={busy} type="submit">
            {busy
              ? UI_TEXT.pleaseWait
              : verified && reset
                ? UI_TEXT.savePassword
                : verified
                  ? UI_TEXT.createAccount
                  : UI_TEXT.verifyContinue}
          </button>
        </form>
      </section>
    </main>
  );
}
