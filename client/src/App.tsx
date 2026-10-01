import { useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { getSessionMember } from "./pages/auth/member";
import { Splash } from "./pages/auth/Splash";
import { Login } from "./pages/auth/Login";
import { OTP } from "./pages/auth/OTP";
import Home from "./pages/Home";
import { Hospitals } from "./pages/discovery/Hospitals";
import { Doctors } from "./pages/discovery/Doctors";
import { DoctorProfile } from "./pages/discovery/DoctorProfile";
import { Packages } from "./pages/discovery/Packages";
import { LabTests } from "./pages/discovery/LabTests";
import { Pharmacy } from "./pages/discovery/Pharmacy";
import { BookAppointment } from "./pages/booking/BookAppointment";
import { Bookings } from "./pages/booking/Bookings";
import { Payment } from "./pages/booking/Payment";
import { OrderTracking } from "./pages/booking/OrderTracking";
import { Profile } from "./pages/profile/Profile";
import { Family } from "./pages/profile/Family";
import { Records } from "./pages/profile/Records";
import { Wallet } from "./pages/profile/Wallet";
import { Notifications } from "./pages/profile/Notifications";
import { Membership } from "./pages/profile/Membership";

function DefaultRoute() {
  return <Navigate to={getSessionMember() ? "/home" : "/login"} replace />;
}

function RequireLogin() {
  return getSessionMember() ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  const location = useLocation();

  useEffect(() => {
    const member = getSessionMember();
    const customerName = member
      ? member.Name?.trim() || sessionStorage.getItem("FullName")?.trim()
      : "";
    document.title = customerName
      ? `${customerName} | OHOINDIA CUSTOMER APP`
      : "OHOINDIA CUSTOMER APP";
  }, [location]);

  return (
    <Routes>
      <Route path="/splash" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/otp" element={<OTP />} />
      <Route path="/" element={<DefaultRoute />} />
      <Route element={<RequireLogin />}>
        <Route path="/home" element={<Home />} />
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
      </Route>
      <Route path="*" element={<DefaultRoute />} />
    </Routes>
  );
}
