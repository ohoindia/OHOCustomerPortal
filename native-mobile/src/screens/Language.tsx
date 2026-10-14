import { useState } from "react";
import { router } from "expo-router";
import { locales, type Locale } from "../../../common/content/locale";
import { Brand, Button, Card, Copy, Heading, Page, s } from "../components/ui";
import { Text } from "react-native";
import { useApp, useLocale, useSession } from "../lib/AppContext";
export default function Language() {
  const locale = useLocale();
  const [selected, setSelected] = useState<Locale>(locale);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { chooseLanguage } = useApp();
  const session = useSession();
  return (
    <Page title="Choose your language" back={false}>
      <Brand />
      <Card>
        <Heading>Welcome to OHOINDIA</Heading>
        <Copy>Select your preferred language</Copy>
        {locales.map((item) => (
          <Button
            key={item.code}
            title={item.name + (selected === item.code ? " ✓" : "")}
            secondary={selected !== item.code}
            disabled={busy}
            onPress={() => setSelected(item.code)}
          />
        ))}
        <Button
          title="Continue"
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void chooseLanguage(selected)
              .then(() => router.replace(session ? "/home" : "/login"))
              .catch(() =>
                setError("Unable to save language. Please try again."),
              )
              .finally(() => setBusy(false));
          }}
        />
        {error && <Text style={s.error}>{error}</Text>}
      </Card>
    </Page>
  );
}
