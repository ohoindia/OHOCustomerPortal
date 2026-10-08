import { useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { UI_TEXT } from "../../../common";
import { translate } from "../../../common/content/locale";
import { setAuthFlow, type Flow } from "../lib/auth-flow";
import { Brand, Button, Copy, Field, Page, s } from "./ui";
type Props = {
  phone: string;
  password: string;
  name: string;
  exists: boolean | null;
  otp: string;
  confirmation: string;
  flow: Flow | null;
  seconds: number;
  busy: boolean;
  checking: boolean;
  error: string;
  otpScreen: boolean;
  changePhone: (value: string) => void;
  setPassword: (value: string) => void;
  setName: (value: string) => void;
  setOtp: (value: string) => void;
  setConfirmation: (value: string) => void;
  submit: () => void;
  sendReset: () => void;
  resend: () => void;
};
export default function LoginPresentation(p: Props) {
  const [visible, setVisible] = useState(false);
  const { flow } = p;
  return (
    <Page auth>
      {!p.otpScreen && (
        <>
          <View style={styles.brand}>
            <Brand />
          </View>
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>
              {UI_TEXT.yourFamilySHealthAccount}
            </Text>
            <Text style={styles.hero}>
              {UI_TEXT.everydayCare}
              {"\n"}
              <Text style={{ color: "#007ca8" }}>
                {UI_TEXT.extraordinaryPeaceOfMind}
              </Text>
            </Text>
            <Text style={styles.introCopy}>
              {
                UI_TEXT.manageYourFamilySRoutineHealthcareMembershipsAndAppointments
              }
            </Text>
            <Pressable
              onPress={() =>
                void Linking.openURL("https://www.ohoindialife.com/concept")
              }
            >
              <Text style={styles.link}>
                {UI_TEXT.discoverHowOhoindiaWorks} ↗
              </Text>
            </Pressable>
          </View>
        </>
      )}
      {p.otpScreen && (
        <Pressable
          onPress={() => {
            setAuthFlow(null);
            router.replace("/login");
          }}
        >
          <Text style={styles.link}>{UI_TEXT.backToLogin}</Text>
        </Pressable>
      )}
      <View style={styles.authCard}>
        {!flow && <Text style={styles.eyebrow}>{UI_TEXT.memberAccess}</Text>}
        <Text style={styles.title}>
          {flow
            ? flow.verified && flow.reset
              ? UI_TEXT.setNewPassword
              : UI_TEXT.verifyOtp
            : p.exists === false
              ? UI_TEXT.joinTheOhoFamily
              : UI_TEXT.welcomeToOhoindia}
        </Text>
        <Copy>
          {flow
            ? flow.verified
              ? UI_TEXT.yourMobileNumberHasBeenVerified
              : `Enter the 6-digit OTP sent to +91 ${p.phone.slice(0, 5)} ${p.phone.slice(5)}`
            : UI_TEXT.enterYourMobileNumberToSignInOrCreate}
        </Copy>
        {!flow ? (
          <>
            <Text style={styles.label}>
              {UI_TEXT.enterMobileNumber}{" "}
              <Text style={{ color: "#dc2626" }}>*</Text>
            </Text>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                accessibilityLabel={UI_TEXT.enterMobileNumber}
                placeholder={UI_TEXT.enterMobileNumber2}
                keyboardType="phone-pad"
                autoComplete="tel-national"
                maxLength={11}
                value={p.phone.replace(/(\d{5})(\d+)/, "$1 $2")}
                editable={!p.busy}
                onChangeText={p.changePhone}
                style={styles.input}
              />
            </View>
            {p.checking && <Copy>{UI_TEXT.checkingMobileNumber}</Copy>}
            {p.exists === true && (
              <>
                <Text style={styles.label}>{UI_TEXT.password}</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    accessibilityLabel={UI_TEXT.password}
                    placeholder={UI_TEXT.enter4DigitPassword}
                    secureTextEntry={!visible}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={p.password}
                    editable={!p.busy}
                    onChangeText={(v) => p.setPassword(v.replace(/\D/g, ""))}
                    style={styles.input}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      visible ? UI_TEXT.hidePassword : UI_TEXT.showPassword
                    }
                    onPress={() => setVisible(!visible)}
                  >
                    <Text style={styles.link}>
                      {visible ? UI_TEXT.hide : UI_TEXT.show}
                    </Text>
                  </Pressable>
                </View>
                <Pressable disabled={p.busy} onPress={p.sendReset}>
                  <Text style={[styles.link, styles.center]}>
                    {UI_TEXT.forgotYourPassword}
                  </Text>
                </Pressable>
              </>
            )}
            {p.exists === false && (
              <>
                <Text style={styles.link}>
                  {UI_TEXT.newCustomerPleaseCreateAnAccount}
                </Text>
                <Field
                  label={UI_TEXT.fullNameAsPerAadhar}
                  placeholder={UI_TEXT.enterFullNameAsPerAadhar}
                  maxLength={200}
                  value={p.name}
                  onChangeText={p.setName}
                  editable={!p.busy}
                />
              </>
            )}
            {!!p.error && (
              <Text accessibilityRole="alert" style={s.error}>
                {p.error}
              </Text>
            )}
            <Button
              title={
                p.busy
                  ? UI_TEXT.pleaseWait
                  : p.exists === true
                    ? UI_TEXT.login
                    : p.exists === false
                      ? UI_TEXT.sendOtp
                      : UI_TEXT.continue
              }
              disabled={p.busy || p.checking}
              onPress={p.submit}
            />
            <Button
              title={translate("Change Language")}
              secondary
              onPress={() => router.push("/language")}
            />
            <Text style={styles.security}>
              {UI_TEXT.yourAccountConnectsYouToYourFamilySCare}
            </Text>
          </>
        ) : (
          <>
            {!flow.verified && (
              <>
                <Field
                  label={UI_TEXT.otp}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={6}
                  value={p.otp}
                  onChangeText={(v) => p.setOtp(v.replace(/\D/g, ""))}
                  editable={!p.busy}
                />
                <Button
                  title={
                    p.seconds
                      ? `Resend OTP in ${p.seconds}s`
                      : flow.resends >= 5
                        ? "Maximum resend limit reached"
                        : "Resend OTP"
                  }
                  secondary
                  disabled={p.busy || p.seconds > 0 || flow.resends >= 5}
                  onPress={p.resend}
                />
              </>
            )}
            {flow.verified && flow.reset && (
              <>
                <Field
                  label={UI_TEXT.new4DigitPassword}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  value={p.password}
                  onChangeText={(v) => p.setPassword(v.replace(/\D/g, ""))}
                  editable={!p.busy}
                />
                <Field
                  label={UI_TEXT.confirmPassword}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                  value={p.confirmation}
                  onChangeText={p.setConfirmation}
                  editable={!p.busy}
                />
              </>
            )}
            {!!p.error && (
              <Text accessibilityRole="alert" style={s.error}>
                {p.error}
              </Text>
            )}
            <Button
              title={
                p.busy
                  ? UI_TEXT.pleaseWait
                  : flow.verified && flow.reset
                    ? "Save password"
                    : "Verify & continue"
              }
              disabled={p.busy}
              onPress={p.submit}
            />
          </>
        )}
      </View>
      {!p.otpScreen && (
        <>
          <View style={styles.network}>
            <Text style={styles.networkTitle}>
              {UI_TEXT.ourNetworkPartneredHospitalServicesAreAvailableIn}
            </Text>
            <Text style={styles.networkCopy}>
              {
                UI_TEXT.hyderabadRangareddyMedchalMalkajgiriSangareddyKhammamWarangalSiddipetAnd
              }
            </Text>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {UI_TEXT.allRightsReservedOhoindia}
            </Text>
            <Text style={styles.footerText}>
              {UI_TEXT.poweredByOhoindiaTechnologyV10}
            </Text>
            <Pressable
              onPress={() =>
                void Linking.openURL("https://www.ohoindialife.com/privacy")
              }
            >
              <Text style={styles.link}>{UI_TEXT.privacyPolicy}</Text>
            </Pressable>
          </View>
        </>
      )}
    </Page>
  );
}
const styles = StyleSheet.create({
  brand: { alignItems: "center", paddingTop: 10 },
  intro: { alignItems: "center", gap: 14 },
  eyebrow: {
    color: "#007ca8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  hero: {
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 36,
    color: "#142344",
    textAlign: "center",
  },
  introCopy: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 23,
    textAlign: "center",
  },
  link: { color: "#007ca8", fontSize: 12, fontWeight: "600", lineHeight: 20 },
  center: { textAlign: "center" },
  authCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 26,
    gap: 16,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#142344" },
  label: { fontSize: 12, fontWeight: "600", color: "#142344" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 10,
  },
  prefix: {
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    paddingRight: 10,
    color: "#142344",
  },
  input: { flex: 1, fontSize: 14, color: "#142344", minHeight: 48 },
  security: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 18,
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },
  network: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 20,
    gap: 8,
  },
  networkTitle: {
    textAlign: "center",
    color: "#007ca8",
    fontSize: 10,
    lineHeight: 18,
    fontWeight: "700",
  },
  networkCopy: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 11,
    lineHeight: 20,
  },
  footer: { alignItems: "center", gap: 10 },
  footerText: { fontSize: 10, color: "#64748b" },
});
