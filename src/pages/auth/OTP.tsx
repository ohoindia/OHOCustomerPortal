import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { authRequest, remainingSeconds } from "./api";
import "./login.css";

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
        throw new Error(response.message || "Unable to resend OTP.");
      setGuid(response.guid);
      setTimer(remainingSeconds(response.futureTime));
      setResends((value) => value + 1);
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details || busy) return;
    setError("");
    if (!verified && !/^\d{6}$/.test(otp)) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    if (
      verified &&
      reset &&
      (!/^\d{4}$/.test(password) || password !== confirmation)
    ) {
      setError("Enter a 4-digit password and matching confirmation.");
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
            result.msg || result.message || "OTP verification failed.",
          );
        setVerified(true);
        if (reset) return;
      }
      if (reset) {
        const result = await authRequest("updatePassword", {
          mobileNumber: details.mobileNumber,
          password,
        });
        if (!result.status)
          throw new Error(result.message || "Unable to update password.");
        navigate("/login", { replace: true });
      } else {
        const result = await authRequest("add", {
          cardHolderType: "Primary",
          mobileNumber: details.mobileNumber,
          name: details.name,
        });
        if (!result.status || !result.data?.customerId)
          throw new Error(
            result.msg ||
              result.message ||
              "Customer creation failed. Please try again.",
          );
        sessionStorage.setItem("member", JSON.stringify({ MemberId: result.data.customerId, Name: details.name, MobileNumber: details.mobileNumber, MemberTypeId: 'Primary' }));
        sessionStorage.setItem("memberId", String(result.data.customerId));
        sessionStorage.setItem("FullName", details.name);
        navigate("/", {
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
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page login-page">
      <Link to="/login">Back to login</Link>
      <section className="auth-card">
        <h1>{verified && reset ? "Set New Password" : "Verify OTP"}</h1>
        <p>
          {verified
            ? "Your mobile number has been verified."
            : `Enter the 6-digit OTP sent to +91 ${details.mobileNumber.slice(0, 5)} ${details.mobileNumber.slice(5)}.`}
        </p>
        <form onSubmit={submit} noValidate>
          {verified && reset ? (
            <>
              <label htmlFor="new-password">New 4-digit password</label>
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
              <label htmlFor="confirm-password">Confirm password</label>
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
                <label htmlFor="otp">OTP</label>
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
                    ? `Resend OTP in ${timer}s`
                    : resends >= 5
                      ? "Maximum resend limit reached"
                      : "Resend OTP"}
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
              ? "Please wait..."
              : verified && reset
                ? "Save Password"
                : verified
                  ? "Create Account"
                  : "Verify & Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
