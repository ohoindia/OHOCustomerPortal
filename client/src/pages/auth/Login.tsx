import { UI_TEXT } from "../../../../common/content/labels";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authRequest, remainingSeconds } from "./api";
import { getSessionMember } from "./member";
import { saveAuthSession } from "./session";
import "./login.css";
import { LanguageLink } from "../Language";

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
      setError(UI_TEXT.mobileNumberMustStartWith678Or);
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
            : UI_TEXT.errorVerifyingMobileNumberTryAgain,
        );
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }

  async function sendOTP(reset = false) {
    if (busy) return;
    if (!reset && !fullName.trim()) {
      setError(UI_TEXT.fullNameIsRequired);
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
          result.message || UI_TEXT.unableToSendOtpPleaseTryAgain,
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
          : UI_TEXT.unableToSendOtpPleaseTryAgain,
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || checking) return;
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      setError(UI_TEXT.pleaseEnterAValid10DigitMobileNumber);
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
      setError(UI_TEXT.pleaseEnterA4DigitPassword);
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
        (Number(member.MemberId) <= 0 &&
          !(Number(member.CommunityCustomerId) > 0))
      )
        throw new Error(result.message || UI_TEXT.loginFailedPleaseTryAgain);
      saveAuthSession(result, member);
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
          : UI_TEXT.somethingWentWrongPleaseTryAgain,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page login-page">
      <header className="login-brand">
        <a
          className="brand-lockup"
          href="https://www.ohoindialife.com/"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={`${import.meta.env.BASE_URL}oho-brand.png`}
            alt=""
            width="54"
            height="54"
          />
          <div>
            <strong>{UI_TEXT.ohoindia}</strong>
            <small>{UI_TEXT.aHyperlocalHealthFintechForBharat}</small>
          </div>
        </a>
      </header>
      <section className="login-intro" aria-labelledby="login-intro-title">
        <span className="login-eyebrow">
          {UI_TEXT.yourFamilySHealthAccount}
        </span>
        <h2 id="login-intro-title">
          {UI_TEXT.everydayCare}
          <br />
          <em>{UI_TEXT.extraordinaryPeaceOfMind}</em>
        </h2>
        <p>
          {UI_TEXT.manageYourFamilySRoutineHealthcareMembershipsAndAppointments}
        </p>
        <div className="login-benefits">
          <div>
            <span aria-hidden="true">{UI_TEXT.value01}</span>
            <strong>{UI_TEXT.yourCareConnected}</strong>
            <p>{UI_TEXT.findDoctorsAndHospitalsInYourNetwork}</p>
          </div>
          <div>
            <span aria-hidden="true">{UI_TEXT.value02}</span>
            <strong>{UI_TEXT.yourBenefitsTogether}</strong>
            <p>{UI_TEXT.keepYourMembershipAndHealthPackagesClose}</p>
          </div>
          <div>
            <span aria-hidden="true">{UI_TEXT.value03}</span>
            <strong>{UI_TEXT.yourFamilyFirst}</strong>
            <p>{UI_TEXT.manageAppointmentsAndFamilyHealthRecords}</p>
          </div>
        </div>
        <a
          className="login-learn"
          href="https://www.ohoindialife.com/concept"
          target="_blank"
          rel="noreferrer"
        >
          {UI_TEXT.discoverHowOhoindiaWorks}
          <span aria-hidden="true">{UI_TEXT.externalLinkIcon}</span>
        </a>
      </section>
      <section className="auth-card">
        <span className="login-eyebrow">{UI_TEXT.memberAccess}</span>
        <h1>
          {exists === false
            ? UI_TEXT.joinTheOhoFamily
            : UI_TEXT.welcomeToOhoindia}
        </h1>
        <p>{UI_TEXT.enterYourMobileNumberToSignInOrCreate}</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="mobileNumber">
            {UI_TEXT.enterMobileNumber}
            <span aria-hidden="true">{UI_TEXT.requiredMarker}</span>
          </label>
          <div className="phone-input">
            <b>{UI_TEXT.value91}</b>
            <input
              id="mobileNumber"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={UI_TEXT.enterMobileNumber2}
              maxLength={11}
              value={mobileNumber.replace(/(\d{5})(\d+)/, "$1 $2")}
              disabled={busy}
              onChange={(event) => void checkMobile(event.target.value)}
              required
            />
          </div>
          {checking && <p role="status">{UI_TEXT.checkingMobileNumber}</p>}
          {exists === true && (
            <>
              <label htmlFor="password">{UI_TEXT.password}</label>
              <div className="phone-input">
                <input
                  id="password"
                  type={visible ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="current-password"
                  placeholder={UI_TEXT.enter4DigitPassword}
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
                  aria-label={
                    visible ? UI_TEXT.hidePassword : UI_TEXT.showPassword
                  }
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? UI_TEXT.hide : UI_TEXT.show}
                </button>
              </div>
              <button
                type="button"
                className="text-btn login-forgot"
                disabled={busy}
                onClick={() => void sendOTP(true)}
              >
                {UI_TEXT.forgotYourPassword}
              </button>
            </>
          )}
          {exists === false && (
            <>
              <p className="login-new">
                {UI_TEXT.newCustomerPleaseCreateAnAccount}
              </p>
              <label htmlFor="fullName">{UI_TEXT.fullNameAsPerAadhar}</label>
              <div className="phone-input">
                <input
                  id="fullName"
                  autoComplete="name"
                  placeholder={UI_TEXT.enterFullNameAsPerAadhar}
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
              ? UI_TEXT.pleaseWait
              : exists === true
                ? UI_TEXT.login
                : exists === false
                  ? UI_TEXT.sendOtp
                  : UI_TEXT.continue}
          </button>
          <LanguageLink button />
        </form>
        <p className="login-security">
          {UI_TEXT.yourAccountConnectsYouToYourFamilySCare}
        </p>
      </section>
      <section
        className="login-network"
        aria-label={UI_TEXT.hospitalServiceAreas}
      >
        <strong>
          {UI_TEXT.ourNetworkPartneredHospitalServicesAreAvailableIn}
        </strong>
        <p>
          <strong>
            {
              UI_TEXT.hyderabadRangareddyMedchalMalkajgiriSangareddyKhammamWarangalSiddipetAnd
            }
          </strong>
        </p>
      </section>
      <footer className="login-footer">
        <span>{UI_TEXT.allRightsReservedOhoindia}</span>
        <span>{UI_TEXT.poweredByOhoindiaTechnologyV10}</span>
        <a
          href="https://www.ohoindialife.com/privacy"
          target="_blank"
          rel="noreferrer"
        >
          {UI_TEXT.privacyPolicy}
        </a>
      </footer>
    </main>
  );
}
