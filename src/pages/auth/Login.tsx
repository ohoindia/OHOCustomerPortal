import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authRequest, remainingSeconds } from "./api";
import { getSessionMember } from "./member";
import "./login.css";

export function Login() {
  const navigate = useNavigate();
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [visible, setVisible] = useState(false);
  const [exists, setExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lookup = useRef<AbortController | null>(null);

  useEffect(() => {
    if (getSessionMember()) navigate("/home", { replace: true });
    return () => lookup.current?.abort();
  }, [navigate]);

  async function checkMobile(value: string) {
    lookup.current?.abort();
    const controller = new AbortController();
    lookup.current = controller;
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(digits);
    setPassword("");
    setFullName("");
    setExists(null);
    setError("");
    setChecking(false);
    if (digits.length !== 10) return;
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError("Mobile number must start with 6, 7, 8, or 9.");
      return;
    }
    setChecking(true);
    try {
      const result = await authRequest(
        "mobileNoValid",
        { mobileNumber: digits },
        controller.signal,
      );
      if (!controller.signal.aborted) setExists(result.status);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Error verifying mobile number. Try again.",
        );
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }

  async function sendOTP(reset = false) {
    if (busy) return;
    if (!reset && !fullName.trim()) {
      setError("Full Name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await authRequest(
        reset ? "toSetNewPassword" : "checkingMobileno",
        { mobileNumber },
      );
      if (!result.status || !result.guid)
        throw new Error(
          result.message || "Unable to send OTP. Please try again.",
        );
      navigate("/otp", {
        state: {
          mobileNumber,
          name: fullName.trim(),
          guid: result.guid,
          timer: remainingSeconds(result.futureTime),
          source: reset ? "reset" : "registration",
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send OTP. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || checking) return;
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (exists === null) {
      await checkMobile(mobileNumber);
      return;
    }
    if (!exists) {
      await sendOTP();
      return;
    }
    if (!/^\d{4}$/.test(password)) {
      setError("Please enter a 4-digit password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await authRequest("memberlogin", {
        mobileNumber,
        Password: password,
      });
      const member = result.memberData?.[0];
      if (
        !result.status ||
        !member ||
        !Number.isFinite(Number(member.MemberId)) ||
        Number(member.MemberId) <= 0
      )
        throw new Error(result.message || "Login failed. Please try again.");
      sessionStorage.setItem("member", JSON.stringify(member));
      for (const [key, value] of Object.entries({
        memberId: member.MemberId,
        gender: member.Gender,
        FullName: member.Name,
        UserImage: member.Image,
        groupId: member.GroupId,
      })) {
        sessionStorage.setItem(key, String(value ?? ""));
      }
      navigate("/home", {
        replace: true,
        state: {
          member,
          memberId: member.MemberId,
          name: member.Name,
          mobileNumber,
        },
      });
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
      <header className="login-brand">
        <img
          src={`${import.meta.env.BASE_URL}applogo.png`}
          alt="OHOINDIA"
          width="60"
          height="60"
        />
        <h2>OHOINDIA</h2>
        <p>
          <strong>
            Unlock OPD's by Subscribing With OHOINDIA &amp;
            <br />
            Explore More Health Packages.
          </strong>
        </p>
      </header>
      <section className="auth-card">
        <h1>Welcome Back!</h1>
        <p>Please login to continue</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="mobileNumber">
            Enter Mobile Number <span aria-hidden="true">*</span>
          </label>
          <div className="phone-input">
            <b>+91</b>
            <input
              id="mobileNumber"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="Enter Mobile Number"
              maxLength={11}
              value={mobileNumber.replace(/(\d{5})(\d+)/, "$1 $2")}
              disabled={busy}
              onChange={(event) => void checkMobile(event.target.value)}
              required
            />
          </div>
          {checking && <p role="status">Checking mobile number...</p>}
          {exists === true && (
            <>
              <label htmlFor="password">Password</label>
              <div className="phone-input">
                <input
                  id="password"
                  type={visible ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="current-password"
                  placeholder="Enter 4-digit Password"
                  maxLength={4}
                  value={password}
                  disabled={busy}
                  onChange={(event) => {
                    setPassword(event.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  required
                />
                <button
                  type="button"
                  className="text-btn"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? "Hide" : "Show"}
                </button>
              </div>
              <button
                type="button"
                className="text-btn login-forgot"
                disabled={busy}
                onClick={() => void sendOTP(true)}
              >
                Forgot your password?
              </button>
            </>
          )}
          {exists === false && (
            <>
              <p className="login-new">
                New Customer – Please create an account.
              </p>
              <label htmlFor="fullName">Full Name (as per Aadhar)</label>
              <div className="phone-input">
                <input
                  id="fullName"
                  autoComplete="name"
                  placeholder="Enter Full Name as per Aadhar"
                  maxLength={200}
                  value={fullName}
                  disabled={busy}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setError("");
                  }}
                  required
                />
              </div>
            </>
          )}
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-btn"
            type="submit"
            disabled={busy || checking}
          >
            {busy
              ? "Please wait..."
              : exists === true
                ? "Login"
                : exists === false
                  ? "Send OTP"
                  : "Continue"}
          </button>
        </form>
      </section>
      <section className="login-network" aria-label="Hospital service areas">
        <strong>
          OUR NETWORK-PARTNERED HOSPITAL SERVICES ARE AVAILABLE IN :
        </strong>
        <p>
          <strong>
            Hyderabad, Rangareddy, Medchal–Malkajgiri, Sangareddy, Khammam,
            Warangal, Siddipet, and Medak
          </strong>
        </p>
      </section>
      <footer className="login-footer">
        <span>All rights reserved. &copy; OHOINDIA</span>
        <span>Powered by OHOINDIA TECHNOLOGY v1.0</span>
        <a
          href="https://www.ohoindialife.in/privacypolicy"
          target="_blank"
          rel="noreferrer"
        >
          Privacy Policy
        </a>
      </footer>
    </main>
  );
}
