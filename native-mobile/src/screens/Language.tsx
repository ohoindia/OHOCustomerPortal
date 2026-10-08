import { useState } from "react";
import { router } from "expo-router";
import { locales, translate } from "../../../common/content/locale";
import { Button, Copy, Heading, Page } from "../components/ui";
import { changeLanguage, useLocale } from "../lib/locale";
import { getSession } from "../lib/session";
export default function Language() {
  const locale = useLocale();
  const [error, setError] = useState("");
  return (
    <Page title={translate("Change Language")}>
      <Heading>{translate("Choose your language")} :</Heading>
      {locales.map(({ code, name }) => (
        <Button
          key={code}
          title={`${name}${locale === code ? " ✓" : ""}`}
          secondary={locale !== code}
          onPress={() =>
            void changeLanguage(code).catch(() =>
              setError(translate("Failed to save language. Please try again.")),
            )
          }
        />
      ))}
      {!!error && <Copy>{error}</Copy>}
      <Button
        title={translate("Continue")}
        onPress={() => router.replace(getSession() ? "/home" : "/login")}
      />
    </Page>
  );
}
