import { useEffect, useRef, useState } from "react";
import { Redirect, router } from "expo-router";
import { getAuthFlow, setAuthFlow, type Flow } from "../lib/auth-flow";
import LoginPresentation from "../components/LoginPresentation";
import { UI_TEXT, remainingSeconds } from "../../../common";

import { authRequest } from "../lib/api";
import { clearSession, saveSession } from "../lib/session";
export default function Login({ otpScreen = false }: { otpScreen?: boolean }) {
  const pending = otpScreen ? getAuthFlow() : null;
  const [phone, setPhone] = useState(pending?.phone ?? "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(pending?.name ?? "");
  const [exists, setExists] = useState<boolean | null>(null);
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [flow, setFlow] = useState<Flow | null>(pending?.flow ?? null);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const lookup = useRef<AbortController | null>(null);
  useEffect(() => () => lookup.current?.abort(), []);
  useEffect(() => {
    if (!flow) return;
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((flow.deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [flow]);
  async function changePhone(input: string) {
    lookup.current?.abort();
    const controller = new AbortController();
    lookup.current = controller;
    const digits = input.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    setExists(null);
    setError("");
    setPassword("");
    setName("");
    setChecking(false);
    if (digits.length !== 10) return;
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError(UI_TEXT.pleaseEnterAValid10DigitMobileNumber);
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
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Unable to verify mobile number.",
        );
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function send(reset: boolean, resend = false) {
    await run(async () => {
      if (!reset && !name.trim()) throw new Error(UI_TEXT.fullNameIsRequired);
      const result = await authRequest(
        reset ? "toSetNewPassword" : "checkingMobileno",
        { mobileNumber: phone },
      );
      if (!result.status || !result.guid)
        throw new Error(result.message || "Unable to send OTP.");
      setOtp("");
      setPassword("");
      setConfirmation("");
      const next: Flow = {
        guid: result.guid,
        reset,
        verified: false,
        deadline: Date.now() + remainingSeconds(result.futureTime) * 1000,
        resends: resend ? (flow?.resends ?? 0) + 1 : 0,
      };
      setAuthFlow({ flow: next, phone, name });
      if (otpScreen) setFlow(next);
      else router.push("/otp");
    });
  }
  async function submit() {
    await run(async () => {
      if (flow) {
        if (!flow.verified) {
          if (!/^\d{6}$/.test(otp))
            throw new Error(UI_TEXT.pleaseEnterTheComplete6DigitOtp);
          const result = await authRequest("OTPValidation", {
            mobileNumber: phone,
            guid: flow.guid,
            otpGenerated: otp,
          });
          if (!result.status)
            throw new Error(
              result.msg || result.message || "OTP verification failed.",
            );
          setFlow({ ...flow, verified: true });
          if (flow.reset) return;
        }
        if (flow.reset) {
          if (!/^\d{4}$/.test(password) || password !== confirmation)
            throw new Error(
              UI_TEXT.enterA4DigitPasswordAndMatchingConfirmation,
            );
          const result = await authRequest("updatePassword", {
            mobileNumber: phone,
            guid: flow.guid,
            otpGenerated: otp,
            password,
          });
          if (!result.status)
            throw new Error(result.message || "Unable to update password.");
          await clearSession();
          setAuthFlow(null);
          router.replace("/login");
          setFlow(null);
          setPassword("");
          setConfirmation("");
          setOtp("");
        } else {
          const result = await authRequest("add", {
            cardHolderType: UI_TEXT.primary,
            mobileNumber: phone,
            name: name.trim(),
            guid: flow.guid,
            otpGenerated: otp,
          });
          if (!result.status || !result.data?.customerId)
            throw new Error(
              result.msg || result.message || "Unable to create account.",
            );
          await saveSession(result, {
            MemberId: result.data.customerId,
            Name: name.trim(),
            MobileNumber: phone,
            MemberTypeId: UI_TEXT.primary,
          });
          setAuthFlow(null);
          router.replace("/home");
        }
        return;
      }
      if (!/^[6-9]\d{9}$/.test(phone))
        throw new Error(UI_TEXT.pleaseEnterAValid10DigitMobileNumber);
      if (exists === null) {
        await changePhone(phone);
        return;
      }
      if (!/^[6-9]\d{9}$/.test(phone) || !/^\d{4}$/.test(password))
        throw new Error("Enter a valid mobile number and 4-digit password.");
      const result = await authRequest("memberlogin", {
        mobileNumber: phone,
        Password: password,
      });
      const member = result.memberData?.[0];
      if (
        !result.status ||
        !member ||
        !(Number(member.MemberId) > 0 || Number(member.CommunityCustomerId) > 0)
      )
        throw new Error(result.message || "Login failed.");
      await saveSession(result, member);
      setAuthFlow(null);
      router.replace("/home");
    });
  }
  if (otpScreen && !pending) return <Redirect href="/login" />;
  return (
    <LoginPresentation
      {...{
        phone,
        password,
        name,
        exists,
        otp,
        confirmation,
        flow,
        seconds,
        busy,
        checking,
        error,
        otpScreen,
      }}
      changePhone={(v) => void changePhone(v)}
      setPassword={setPassword}
      setName={setName}
      setOtp={setOtp}
      setConfirmation={setConfirmation}
      submit={() => void (exists === false && !flow ? send(false) : submit())}
      sendReset={() => void send(true)}
      resend={() => void send(flow!.reset, true)}
    />
  );
}
