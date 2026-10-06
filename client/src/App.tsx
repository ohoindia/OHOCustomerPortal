import { UI_TEXT, UI_MESSAGES } from "../../common/content/labels";
import { capitalizeName } from "../../common/utils/names";
import { useEffect, useSyncExternalStore } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { getSessionMember } from "./pages/auth/member";
import {
  clearAuthSession,
  getAccessToken,
  subscribeAuthSession,
} from "./pages/auth/session";
import { Splash } from "./pages/auth/Splash";
import { Login } from "./pages/auth/Login";
import { OTP } from "./pages/auth/OTP";
import Home from "./pages/Home";
import AccountDetailsPage from "./pages/AccountDetails";
import { Hospitals } from "./pages/discovery/Hospitals";
import { Doctors } from "./pages/discovery/Doctors";
import { DoctorProfile } from "./pages/discovery/DoctorProfile";
import { Packages } from "./pages/discovery/Packages";
import { PurchaseDetails, PurchaseFlow } from "./pages/purchase/Purchase";
import { LabTests } from "./pages/discovery/LabTests";
import { Pharmacy } from "./pages/discovery/Pharmacy";
import { BookAppointment } from "./pages/booking/BookAppointment";
import { BookService } from "./pages/booking/BookService";
import { Bookings } from "./pages/booking/Bookings";
import { Payment } from "./pages/booking/Payment";
import { OrderTracking } from "./pages/booking/OrderTracking";
import { Profile } from "./pages/profile/Profile";
import { Family } from "./pages/profile/Family";
import { Records } from "./pages/profile/Records";
import { Wallet } from "./pages/profile/Wallet";
import { Notifications } from "./pages/profile/Notifications";
import { Membership } from "./pages/profile/Membership";
import {
  PortalMenu,
  CustomerProfile,
  FamilyMembers,
  PurchasedPackages,
  ConsultationList,
  HospitalNetwork,
  HospitalDetails,
  Products,
  ProductDetails,
  KycVerification,
  AccountManagement,
  Support,
  PrivacyPolicy,
  AboutUs,
} from "./pages/portal/PortalPages";
import {
  BMICalculator,
  MeditationBreathing,
  DailyTracker,
} from "./pages/portal/Wellness";

function DefaultRoute() {
  return <Navigate to={getSessionMember() ? "/home" : "/login"} replace />;
}

function RequireLogin() {
  return getSessionMember() ? <Outlet /> : <Navigate to="/login" replace />;
}

function ProductDetailsRoute() {
  const location = useLocation();
  return new URLSearchParams(location.search).get("purchase") === "1" ? (
    <PurchaseDetails />
  ) : (
    <ProductDetails />
  );
}

export default function App() {
  const location = useLocation();
  const token = useSyncExternalStore(
    subscribeAuthSession,
    getAccessToken,
    () => null,
  );

  useEffect(() => {
    if (!token) return;
    const expiresAt = Date.parse(
      sessionStorage.getItem("tokenExpiresAt") ?? "",
    );
    const timeout = window.setTimeout(
      () => clearAuthSession(),
      Math.max(0, expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [token]);

  useEffect(() => {
    const member = getSessionMember();
    const customerName = member
      ? member.Name?.trim() || sessionStorage.getItem("FullName")?.trim()
      : "";
    document.title = customerName
      ? UI_MESSAGES.ohoindiaCustomerApp(capitalizeName(customerName))
      : UI_TEXT.ohoindiaCustomerApp2;
  }, [location, token]);

  return (
    <Routes>
      <Route path="/splash" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/otp" element={<OTP />} />
      <Route path="/" element={<DefaultRoute />} />
      <Route element={<RequireLogin />}>
        <Route path="/home" element={<Home />} />
        <Route path="/account-details" element={<AccountDetailsPage />} />
        <Route path="/hospitals" element={<Hospitals />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctor/:id" element={<DoctorProfile />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/lab-tests" element={<LabTests />} />
        <Route path="/pharmacy" element={<Pharmacy />} />
        <Route path="/book-appointment" element={<BookAppointment />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/order-tracking" element={<OrderTracking />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/family" element={<Family />} />
        <Route path="/records" element={<Records />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/menu" element={<PortalMenu />} />
        <Route path="/myprofile" element={<CustomerProfile />} />
        <Route path="/family-members" element={<FamilyMembers />} />
        <Route path="/PurchasedPackages" element={<PurchasedPackages />} />
        <Route path="/CustomerProductDetails" element={<PurchasedPackages />} />
        <Route path="/policies/:policyId" element={<PurchasedPackages />} />
        <Route path="/NomineeDetails" element={<PurchasedPackages />} />
        <Route path="/network" element={<HospitalNetwork />} />
        <Route path="/hospitallist" element={<HospitalNetwork />} />
        <Route path="/hospitalDetails" element={<HospitalDetails />} />
        <Route path="/hospitalService" element={<BookService />} />
        <Route path="/book-service" element={<BookService />} />
        <Route path="/hospitalCode" element={<HospitalDetails />} />
        <Route path="/hospital-map" element={<HospitalNetwork />} />
        <Route path="/products" element={<Products />} />
        <Route path="/healthproducts" element={<Products />} />
        <Route path="/product-details" element={<ProductDetailsRoute />} />
        <Route path="/purchase/:orderId/:step" element={<PurchaseFlow />} />
        <Route path="/kyc-verification" element={<KycVerification />} />
        <Route path="/account-management" element={<AccountManagement />} />
        <Route path="/resetpassword" element={<AccountManagement />} />
        <Route path="/support" element={<Support />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/aboutus" element={<AboutUs />} />
        <Route path="/BMICalculator" element={<BMICalculator />} />
        <Route path="/MeditationBreathing" element={<MeditationBreathing />} />
        <Route
          path="/StepTracker"
          element={<DailyTracker key="steps" kind="steps" />}
        />
        <Route
          path="/NutritionTracking"
          element={<DailyTracker key="nutrition" kind="nutrition" />}
        />
        <Route path="/dashboard" element={<Home />} />
        <Route path="/ConsultationList" element={<ConsultationList />} />
        <Route path="/hospitalConsulationForm" element={<ConsultationList />} />
      </Route>
      <Route path="*" element={<DefaultRoute />} />
    </Routes>
  );
}
