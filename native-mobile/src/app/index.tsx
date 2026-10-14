import { Redirect } from "expo-router";
import { useApp, useSession } from "../lib/AppContext";
export default function Index() {
  const session = useSession();
  const { languageChosen } = useApp();
  return (
    <Redirect
      href={session ? "/home" : languageChosen ? "/login" : "/language"}
    />
  );
}
