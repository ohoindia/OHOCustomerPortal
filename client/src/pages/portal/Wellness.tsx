import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AppShell, PageHeader } from "../../components/Layout";
import { getSessionMember } from "../auth/member";
import "./portal.css";

export function BMICalculator() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState("");
  function calculate(event: FormEvent) {
    event.preventDefault();
    const meters = Number(height) / 100;
    if (meters <= 0 || Number(weight) <= 0) return;
    setResult((Number(weight) / (meters * meters)).toFixed(1));
  }
  return (
    <AppShell className="portal-page">
      <PageHeader title="BMI Calculator" />
      <div className="portal-content">
        <form onSubmit={calculate}>
          <label className="portal-label">
            Height (cm)
            <input
              type="number"
              min="1"
              max="300"
              step="0.1"
              required
              value={height}
              onChange={(e) => {
                setHeight(e.target.value);
                setResult("");
              }}
            />
          </label>
          <label className="portal-label">
            Weight (kg)
            <input
              type="number"
              min="1"
              max="600"
              step="0.1"
              required
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                setResult("");
              }}
            />
          </label>
          <button className="primary-btn">Calculate BMI</button>
        </form>
        {result && (
          <p role="status">
            Your BMI: <strong>{result}</strong>
          </p>
        )}
      </div>
    </AppShell>
  );
}

export function MeditationBreathing() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => setSeconds((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [running]);
  const phase =
    seconds % 12 < 4 ? "Breathe in" : seconds % 12 < 8 ? "Hold" : "Breathe out";
  return (
    <AppShell className="portal-page">
      <PageHeader title="Meditation & Breathing" />
      <div className="portal-content">
        <p>Follow the breathing timer at a comfortable pace.</p>
        <div className="portal-card" aria-live="polite">
          <h2>{running ? phase : "Ready when you are"}</h2>
          <p>
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </p>
        </div>
        <button
          className="primary-btn"
          onClick={() => setRunning((value) => !value)}
        >
          {running ? "Pause" : "Start"}
        </button>
        <button
          className="outline-btn"
          onClick={() => {
            setRunning(false);
            setSeconds(0);
          }}
        >
          Reset
        </button>
      </div>
    </AppShell>
  );
}

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
type Entry = { id: string; label: string; amount: number };
function readEntries(key: string): Entry[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter(
          (row): row is Entry =>
            row &&
            typeof row.id === "string" &&
            typeof row.label === "string" &&
            Number.isFinite(row.amount) &&
            row.amount > 0,
        )
      : [];
  } catch {
    return [];
  }
}
export function DailyTracker({ kind }: { kind: "steps" | "nutrition" }) {
  const isSteps = kind === "steps";
  const member = getSessionMember();
  const key = `oho-wellness:${member?.MemberId || `community-${member?.CommunityCustomerId}`}:${kind}:${today()}`;
  const [entries, setEntries] = useState(() => readEntries(key));
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const total = entries.reduce((sum, row) => sum + row.amount, 0);
  function save(next: Entry[]) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setEntries(next);
      setError("");
    } catch {
      setError(
        "Unable to save on this device. Check your browser storage settings.",
      );
    }
  }
  function add(event: FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return;
    save([
      ...entries,
      {
        id: crypto.randomUUID(),
        label: isSteps ? label.trim() || "Walk" : label.trim(),
        amount: Number(amount),
      },
    ]);
    setLabel("");
    setAmount("");
  }
  return (
    <AppShell className="portal-page">
      <PageHeader title={isSteps ? "Step Tracker" : "Nutrition Tracking"} />
      <div className="portal-content">
        <p>
          Record today’s {isSteps ? "steps" : "meals"}. Entries are saved on
          this device.
        </p>
        <div className="portal-card">
          <h2>
            {total.toLocaleString()} {isSteps ? "steps" : "kcal"}
          </h2>
          <p>{today()}</p>
        </div>
        <form onSubmit={add}>
          <label className="portal-label">
            {isSteps ? "Activity (optional)" : "Meal"}
            <input
              required={!isSteps}
              maxLength={100}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="portal-label">
            {isSteps ? "Steps" : "Calories (kcal)"}
            <input
              type="number"
              min="1"
              max={isSteps ? 100000 : 10000}
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <button className="primary-btn">
            Add {isSteps ? "steps" : "meal"}
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
        {entries.map((row) => (
          <article className="portal-card" key={row.id}>
            <strong>{row.label}</strong>
            <p>
              {row.amount.toLocaleString()} {isSteps ? "steps" : "kcal"}
            </p>
            <button
              className="text-btn"
              aria-label={`Remove ${row.label}`}
              onClick={() =>
                save(entries.filter((entry) => entry.id !== row.id))
              }
            >
              Remove
            </button>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
