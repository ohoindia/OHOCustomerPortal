const fs = require("node:fs");
const path = require("node:path");
const base = path.resolve(__dirname, "../src/app/(member)");
const screens = {
  home: ["Home"],
  dashboard: ["Home"],
  "account-details": ["AccountDetails"],
  profile: ["Account", "Profile"],
  myprofile: ["Account", "CustomerProfile"],
  family: ["Account", "Family"],
  "family-members": ["Account", "Family"],
  bookings: ["Account", "Bookings"],
  ConsultationList: ["Account", "Bookings"],
  hospitalConsulationForm: ["Account", "Bookings"],
  membership: ["Account", "Membership"],
  PurchasedPackages: ["Account", "Membership"],
  CustomerProductDetails: ["Account", "Membership"],
  "policies/[policyId]": ["RouteScreens", "PolicyRoute"],
  NomineeDetails: ["RouteScreens", "NomineesRoute"],
  menu: ["Account", "MoreServices"],
  aboutus: ["Account", "About"],
  hospitals: ["Hospitals"],
  network: ["Hospitals"],
  hospitallist: ["Hospitals"],
  "hospital-map": ["RouteScreens", "HospitalMapRoute"],
  hospitalDetails: ["RouteScreens", "HospitalDetailsRoute"],
  "hospital-details": ["RouteScreens", "HospitalDetailsRoute"],
  hospitalCode: ["RouteScreens", "HospitalDetailsRoute"],
  "book-service": ["BookService"],
  hospitalService: ["BookService"],
  products: ["Portal", "Products"],
  healthproducts: ["Portal", "Products"],
  "product-details": ["RouteScreens", "ProductRoute"],
  packages: ["Packages"],
  "purchase/[orderId]/[step]": ["Purchase", "PurchaseRoute"],
  "kyc-verification": ["Portal", "Kyc"],
  support: ["Portal", "Support"],
  "privacy-policy": ["Portal", "Privacy"],
  "account-management": ["AccountManagement"],
  resetpassword: ["AccountManagement"],
  BMICalculator: ["Wellness", "Bmi"],
  MeditationBreathing: ["Wellness", "Breathing"],
  StepTracker: ["RouteScreens", "StepsRoute"],
  NutritionTracking: ["RouteScreens", "NutritionRoute"],
  doctors: ["RouteScreens", "DoctorsRoute"],
  "doctor/[id]": ["RouteScreens", "DoctorRoute"],
  "lab-tests": ["RouteScreens", "LabsRoute"],
  pharmacy: ["RouteScreens", "PharmacyRoute"],
  "catalog-detail": ["RouteScreens", "CatalogRoute"],
  "book-appointment": ["Demo", "AppointmentPreview"],
  payment: ["Demo", "Payment"],
  "order-tracking": ["Demo", "OrderTracking"],
  wallet: ["Wallet"],
  records: ["Demo", "Records"],
  notifications: ["Demo", "Notifications"],
};
for (const [route, [screen, exported]] of Object.entries(screens)) {
  const file = path.join(base, `${route}.tsx`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const target = path
    .relative(
      path.dirname(file),
      path.resolve(__dirname, `../src/screens/${screen}`),
    )
    .replaceAll("\\", "/");
  fs.writeFileSync(
    file,
    `export { ${exported ? `${exported} as default` : "default"} } from "${target}";\n`,
  );
}
fs.writeFileSync(
  path.join(base, "_layout.tsx"),
  `import { Stack } from "expo-router";
import { View } from "react-native";
import BottomNavigation from "../../components/BottomNavigation";
export default function MemberLayout() { return <View style={{ flex: 1 }}><Stack screenOptions={{ headerShown: false }} /><BottomNavigation /></View>; }
`,
);
fs.writeFileSync(
  path.join(base, "[...path].tsx"),
  `import { Redirect } from "expo-router";\nexport default function Unknown() { return <Redirect href="/home" />; }\n`,
);
