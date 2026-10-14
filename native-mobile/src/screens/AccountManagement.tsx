import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { remainingSeconds } from "../../../common";
import { Button, Card, Copy, Field, Heading, Page, s } from "../components/ui";
import { authRequest } from "../lib/api";
import { getSession } from "../lib/session";
export default function AccountManagement() {
  const mobileNumber = getSession()!.member.MobileNumber;
  const [flow, setFlow] = useState<{
    guid: string;
    verified: boolean;
    deadline: number;
    resends: number;
  } | null>(null);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const locked = useRef(false);
  useEffect(() => {
    if (!flow || flow.verified) return;
    const timer = setInterval(
      () =>
        setSeconds(Math.max(0, Math.ceil((flow.deadline - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [flow]);
  async function run(resend = false) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      if (!mobileNumber)
        throw new Error("No mobile number is linked to this account.");
      if (!flow || resend) {
        if (resend && flow && Date.now() < flow.deadline)
          throw new Error("Please wait before requesting another OTP.");
        if (resend && flow && flow.resends >= 5)
          throw new Error("Maximum resend limit reached.");
        const result = await authRequest("toSetNewPassword", { mobileNumber });
        if (!result.status || !result.guid)
          throw new Error(result.message || "Unable to send OTP.");
        setFlow({
          guid: result.guid,
          verified: false,
          deadline: Date.now() + remainingSeconds(result.futureTime) * 1000,
          resends: resend ? (flow?.resends ?? 0) + 1 : 0,
        });
        setSeconds(remainingSeconds(result.futureTime));
        setOtp("");
        setPassword("");
        setConfirmation("");
        setSaved(false);
      } else if (!flow.verified) {
        if (!/^\d{6}$/.test(otp))
          throw new Error("Enter the complete 6-digit OTP.");
        const result = await authRequest("OTPValidation", {
          mobileNumber,
          guid: flow.guid,
          otpGenerated: otp,
        });
        if (!result.status)
          throw new Error(
            result.message || result.msg || "OTP verification failed.",
          );
        setFlow({ ...flow, verified: true });
      } else {
        if (!/^\d{4}$/.test(password) || password !== confirmation)
          throw new Error(
            "Enter a 4-digit password and matching confirmation.",
          );
        const result = await authRequest("updatePassword", {
          mobileNumber,
          guid: flow.guid,
          otpGenerated: otp,
          password,
        });
        if (!result.status)
          throw new Error(result.message || "Unable to update password.");
        setFlow(null);
        setOtp("");
        setPassword("");
        setConfirmation("");
        setSaved(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Page title="Account management">
      <Button
        title="Change Language"
        secondary
        onPress={() => router.push("/language")}
      />
      <Button
        title="View personal details"
        secondary
        onPress={() => router.push("/myprofile")}
      />
      <Card>
        <Heading>Reset your password</Heading>
        <Copy>
          Verify the OTP sent to {mobileNumber} to set a new 4-digit password.
        </Copy>
        {saved && <Copy>Your password was updated.</Copy>}
        {flow && !flow.verified && (
          <>
            <Field
              label="6-digit OTP"
              keyboardType="number-pad"
              autoComplete="sms-otp"
              maxLength={6}
              value={otp}
              editable={!busy}
              onChangeText={(v) => setOtp(v.replace(/\D/g, ""))}
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
              onPress={() => void run(true)}
            />
          </>
        )}
        {flow?.verified && (
          <>
            <Field
              label="New 4-digit password"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={password}
              editable={!busy}
              onChangeText={(v) => setPassword(v.replace(/\D/g, ""))}
            />
            <Field
              label="Confirm password"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={confirmation}
              editable={!busy}
              onChangeText={setConfirmation}
            />
          </>
        )}
        {!!error && (
          <Text style={s.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
        <Button
          title={
            busy
              ? "Please wait…"
              : !flow
                ? "Send OTP"
                : flow.verified
                  ? "Save password"
                  : "Verify OTP"
          }
          disabled={busy}
          onPress={() => void run()}
        />
      </Card>
    </Page>
  );
}
