import type { Href } from "expo-router";
const aliases: Record<string, string> = {
  "/dashboard": "/home",
  "/hospitallist": "/hospitals",
  "/hospital-map": "/hospitals",
  "/hospitalDetails": "/hospital-details",
  "/hospitalCode": "/hospital-details",
  "/hospitalService": "/book-service",
  "/healthproducts": "/products",
  "/hospitalConsulationForm": "/bookings",
  "/resetpassword": "/account-management",
  "/PurchasedPackages": "/membership",
  "/CustomerProductDetails": "/membership",
  "/NomineeDetails": "/nominees",
  "/ConsultationList": "/bookings",
  "/network": "/hospitals",
  "/myprofile": "/customer-profile",
  "/family-members": "/family",
  "/BMICalculator": "/bmi",
  "/MeditationBreathing": "/breathing",
  "/StepTracker": "/steps",
  "/NutritionTracking": "/nutrition",
};
export const destination = (path: string) => (aliases[path] || path) as Href;
