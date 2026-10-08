import { Redirect } from "expo-router";
import { getSession } from "../lib/session";
export default function Index() {
  return <Redirect href={getSession() ? "/home" : "/login"} />;
}
