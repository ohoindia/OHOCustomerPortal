import { useState } from "react";
import { router } from "expo-router";
import { UI_TEXT, remainingSeconds } from "../../../common";
import { Button, Copy, Page } from "../components/ui";
import { authRequest } from "../lib/api";
import { getSession } from "../lib/session";
import { setAuthFlow } from "../lib/auth-flow";
export function AccountManagement() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function reset() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const phone = getSession()?.member.MobileNumber;
      if (!phone) throw new Error(UI_TEXT.noMobileNumberIsLinkedToThisAccount);
      const result = await authRequest("toSetNewPassword", {
        mobileNumber: phone,
      });
      if (!result.status || !result.guid)
        throw new Error(result.message || UI_TEXT.unableToSendOtp);
      setAuthFlow({
        phone,
        name: "",
        flow: {
          guid: result.guid,
          reset: true,
          verified: false,
          deadline: Date.now() + remainingSeconds(result.futureTime) * 1000,
          resends: 0,
        },
      });
      router.push("/otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : UI_TEXT.unableToResetPassword);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title={UI_TEXT.accountManagement}>
      <Button
        title="Change Language"
        secondary
        onPress={() => router.push("/language")}
      />
      <Button
        title={UI_TEXT.viewPersonalDetails}
        secondary
        onPress={() => router.push("/myprofile")}
      />
      <Copy>{UI_TEXT.resetYourFourDigitPasswordUsingAnOtpSent}</Copy>
      <Button
        title={busy ? UI_TEXT.sendingOtp : UI_TEXT.resetPassword}
        disabled={busy}
        onPress={() => void reset()}
      />
      {!!error && <Copy>{error}</Copy>}
    </Page>
  );
}
