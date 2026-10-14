import { useEffect, useState } from "react";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DISPLAY_FORMAT } from "../../../common";
import { Button, Card, Copy, Field, Heading, Page, s } from "../components/ui";
import { getSession } from "../lib/session";
export function Bmi() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  return (
    <Page title="BMI calculator">
      <Field
        label="Height (cm)"
        keyboardType="decimal-pad"
        value={height}
        onChangeText={(v) => {
          setHeight(v);
          setResult("");
        }}
      />
      <Field
        label="Weight (kg)"
        keyboardType="decimal-pad"
        value={weight}
        onChangeText={(v) => {
          setWeight(v);
          setResult("");
        }}
      />
      <Button
        title="Calculate BMI"
        onPress={() => {
          const h = Number(height);
          const w = Number(weight);
          if (!(h > 0 && h <= 300 && w > 0 && w <= 600)) {
            setError(
              "Enter a height from 1–300 cm and a weight from 1–600 kg.",
            );
            return;
          }
          setError("");
          setResult((w / (h / 100) ** 2).toFixed(1));
        }}
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      {result && (
        <Card>
          <Copy>Your BMI</Copy>
          <Heading>{result}</Heading>
        </Card>
      )}
    </Page>
  );
}
export function Breathing() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return (
    <Page title="Meditation & breathing">
      <Card>
        <Heading>
          {!running
            ? "Take a moment for yourself"
            : elapsed % 12 < 4
              ? "Breathe in"
              : elapsed % 12 < 8
                ? "Hold"
                : "Breathe out"}
        </Heading>
        <Copy>Follow a gentle 4-second breathing rhythm.</Copy>
        <Button
          title={running ? "Stop" : "Start breathing"}
          onPress={() => {
            setRunning((v) => !v);
            setElapsed(0);
          }}
        />
      </Card>
    </Page>
  );
}
export function Tracker({ kind }: { kind: "steps" | "nutrition" }) {
  const member = getSession()!.member;
  const [day, setDay] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: DISPLAY_FORMAT.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const key = `oho:${member.MemberId}:${Number(member.CommunityCustomerId || 0)}:${kind}:${day}`;
  const [amount, setAmount] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const ready = loadedKey === key;
  useEffect(() => {
    const timer = setInterval(
      () =>
        setDay(
          new Intl.DateTimeFormat("en-CA", {
            timeZone: DISPLAY_FORMAT.timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date()),
        ),
      60000,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(key)
      .then((value) => {
        if (active) {
          setAmount(value || "");
          setSaved(value || "");
          setLoadedKey(key);
        }
      })
      .catch(() => {
        if (active) setError("Unable to read your saved entry.");
      });
    return () => {
      active = false;
    };
  }, [key]);
  return (
    <Page title={kind === "steps" ? "Step tracker" : "Nutrition tracking"}>
      <Copy>{day} · Manually recorded on this device, per account.</Copy>
      <Field
        label={kind === "steps" ? "Steps today" : "Calories today"}
        keyboardType="number-pad"
        value={ready ? amount : ""}
        editable={ready}
        onChangeText={setAmount}
      />
      <Button
        title="Save entry"
        disabled={!ready}
        onPress={() => {
          if (!/^\d+$/.test(amount) || !Number.isSafeInteger(Number(amount))) {
            setError("Enter a valid whole number.");
            return;
          }
          void AsyncStorage.setItem(key, amount)
            .then(() => {
              setSaved(amount);
              setError("");
            })
            .catch(() => setError("Unable to save entry."));
        }}
      />
      {ready && !!saved && (
        <Card>
          <Heading>
            {saved} {kind === "steps" ? "steps" : "calories"}
          </Heading>
        </Card>
      )}
      {!!error && <Text style={s.error}>{error}</Text>}
    </Page>
  );
}
