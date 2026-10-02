import { DISPLAY_FORMAT } from "../../../../common/content/config";
import { UI_TEXT, UI_MESSAGES } from "../../../../common/content/labels";
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
      <PageHeader title={UI_TEXT.bmiCalculator} />
      <div className="portal-content">
        <form onSubmit={calculate}>
          <label className="portal-label">
            {UI_TEXT.heightCm}
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
            {UI_TEXT.weightKg}
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
          <button className="primary-btn">{UI_TEXT.calculateBmi}</button>
        </form>
        {result && (
          <p role="status">
            {UI_TEXT.yourBmi}
            <strong>{result}</strong>
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
    seconds % 12 < 4
      ? UI_TEXT.breatheIn
      : seconds % 12 < 8
        ? UI_TEXT.hold
        : UI_TEXT.breatheOut;
  return (
    <AppShell className="portal-page">
      <PageHeader title={UI_TEXT.meditationBreathing} />
      <div className="portal-content">
        <p>{UI_TEXT.followTheBreathingTimerAtAComfortablePace}</p>
        <div className="portal-card" aria-live="polite">
          <h2>{running ? phase : UI_TEXT.readyWhenYouAre}</h2>
          <p>
            {Math.floor(seconds / 60)}
            {UI_TEXT.colon}
            {String(seconds % 60).padStart(2, "0")}
          </p>
        </div>
        <button
          className="primary-btn"
          onClick={() => setRunning((value) => !value)}
        >
          {running ? UI_TEXT.pause : UI_TEXT.start}
        </button>
        <button
          className="outline-btn"
          onClick={() => {
            setRunning(false);
            setSeconds(0);
          }}
        >
          {UI_TEXT.reset}
        </button>
      </div>
    </AppShell>
  );
}

function today() {
  return new Intl.DateTimeFormat(DISPLAY_FORMAT.dayKeyLocale, {
    timeZone: DISPLAY_FORMAT.timeZone,
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
      setError(UI_TEXT.unableToSaveOnThisDeviceCheckYourBrowser);
    }
  }
  function add(event: FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return;
    save([
      ...entries,
      {
        id: crypto.randomUUID(),
        label: isSteps ? label.trim() || UI_TEXT.walk : label.trim(),
        amount: Number(amount),
      },
    ]);
    setLabel("");
    setAmount("");
  }
  return (
    <AppShell className="portal-page">
      <PageHeader
        title={isSteps ? UI_TEXT.stepTracker : UI_TEXT.nutritionTracking}
      />
      <div className="portal-content">
        <p>
          {UI_TEXT.recordTodayS}
          {isSteps ? UI_TEXT.stepUnit : UI_TEXT.meals}
          {UI_TEXT.entriesAreSavedOnThisDevice}
        </p>
        <div className="portal-card">
          <h2>
            {total.toLocaleString()}{" "}
            {isSteps ? UI_TEXT.stepUnit : UI_TEXT.calorieUnit}
          </h2>
          <p>{today()}</p>
        </div>
        <form onSubmit={add}>
          <label className="portal-label">
            {isSteps ? UI_TEXT.activityOptional : UI_TEXT.meal}
            <input
              required={!isSteps}
              maxLength={100}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="portal-label">
            {isSteps ? UI_TEXT.steps : UI_TEXT.caloriesKcal}
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
            {UI_TEXT.add2}
            {isSteps ? UI_TEXT.stepUnit : UI_TEXT.mealUnit}
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
        {entries.map((row) => (
          <article className="portal-card" key={row.id}>
            <strong>{row.label}</strong>
            <p>
              {row.amount.toLocaleString()}{" "}
              {isSteps ? UI_TEXT.stepUnit : UI_TEXT.calorieUnit}
            </p>
            <button
              className="text-btn"
              aria-label={UI_MESSAGES.remove(row.label)}
              onClick={() =>
                save(entries.filter((entry) => entry.id !== row.id))
              }
            >
              {UI_TEXT.remove2}
            </button>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
