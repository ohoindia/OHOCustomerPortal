import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import { UI_TEXT, remainingSeconds } from "../../../common";
import {
  Brand,
  Button,
  Card,
  Copy,
  Field,
  Heading,
  Page,
  s,
} from "../components/ui";
import { authRequest } from "../lib/api";
import { saveSession } from "../lib/session";
type Flow = {
  guid: string;
  reset: boolean;
  verified: boolean;
  deadline: number;
  resends: number;
};
export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [exists, setExists] = useState<boolean | null>(null);
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [flow, setFlow] = useState<Flow | null>(null);
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
      setFlow({
        guid: result.guid,
        reset,
        verified: false,
        deadline: Date.now() + remainingSeconds(result.futureTime) * 1000,
        resends: resend ? (flow?.resends ?? 0) + 1 : 0,
      });
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
        }
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
    });
  }
  return (
    <Page>
      <Brand />
      <Card>
        <Heading>
          {flow
            ? flow.verified && flow.reset
              ? UI_TEXT.setNewPassword
              : UI_TEXT.verifyOtp
            : "Welcome to OHOINDIA"}
        </Heading>
        <Copy>
          {flow
            ? `Verify your mobile number +91 ${phone}`
            : "Your family’s health, all in one place."}
        </Copy>
        {!flow ? (
          <>
            <Field
              label={UI_TEXT.mobileNumber}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              editable={!busy}
              onChangeText={(v) => void changePhone(v)}
            />
            {checking && <Copy>Checking mobile number…</Copy>}
            {exists === false && (
              <Field
                label={UI_TEXT.name}
                value={name}
                onChangeText={setName}
                editable={!busy}
              />
            )}
            {exists === true && (
              <>
                <Field
                  label="4-digit password"
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  value={password}
                  onChangeText={(v) => setPassword(v.replace(/\D/g, ""))}
                  editable={!busy}
                />
                <Button
                  title="Forgot password?"
                  secondary
                  disabled={busy}
                  onPress={() => void send(true)}
                />
              </>
            )}
            <Button
              title={
                busy
                  ? UI_TEXT.pleaseWait
                  : exists === false
                    ? "Send OTP"
                    : "Login"
              }
              disabled={busy || checking || exists === null}
              onPress={() =>
                exists === false ? void send(false) : void submit()
              }
            />
            {!!error && exists === null && phone.length === 10 && (
              <Button
                title="Check mobile again"
                secondary
                onPress={() => void changePhone(phone)}
              />
            )}
          </>
        ) : (
          <>
            {!flow.verified && (
              <>
                <Field
                  label="6-digit OTP"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={6}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, ""))}
                  editable={!busy}
                />
                <Button
                  title={
                    seconds
                      ? `Resend OTP in ${seconds}s`
                      : flow.resends >= 5
                        ? "Maximum resend limit reached"
                        : "Resend OTP"
                  }
                  secondary
                  disabled={busy || seconds > 0 || flow.resends >= 5}
                  onPress={() => void send(flow.reset, true)}
                />
              </>
            )}
            {flow.verified && flow.reset && (
              <>
                <Field
                  label="New 4-digit password"
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  value={password}
                  onChangeText={(v) => setPassword(v.replace(/\D/g, ""))}
                  editable={!busy}
                />
                <Field
                  label="Confirm password"
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                  value={confirmation}
                  onChangeText={setConfirmation}
                  editable={!busy}
                />
              </>
            )}
            <Button
              title={
                busy
                  ? UI_TEXT.pleaseWait
                  : flow.verified && flow.reset
                    ? "Save password"
                    : flow.verified
                      ? "Create account"
                      : "Verify & continue"
              }
              disabled={busy}
              onPress={() => void submit()}
            />
            <Button
              title="Back to login"
              secondary
              disabled={busy}
              onPress={() => {
                setFlow(null);
                setPassword("");
                setError("");
              }}
            />
          </>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
      </Card>
      <Copy>
        By continuing, you agree to OHOINDIA’s terms and privacy policy.
      </Copy>
    </Page>
  );
}
