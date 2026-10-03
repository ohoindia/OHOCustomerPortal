import type { Href } from "expo-router";
const aliases: Record<string, string> = {
  "/PurchasedPackages": "/membership",
  "/CustomerProductDetails": "/membership",
  "/NomineeDetails": "/nominees",
  "/ConsultationList": "/bookings",
  "/network": "/hospitals",
  "/myprofile": "/account-details",
  "/family-members": "/family",
  "/BMICalculator": "/bmi",
  "/MeditationBreathing": "/breathing",
  "/StepTracker": "/steps",
  "/NutritionTracking": "/nutrition",
};
export const destination = (path: string) => (aliases[path] || path) as Href;
