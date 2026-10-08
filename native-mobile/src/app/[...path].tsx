import Bookings from "../screens/Bookings";
import { Redirect, useLocalSearchParams } from "expo-router";
import Hospitals from "../screens/Hospitals";
import BookService from "../screens/BookService";
import Packages from "../screens/Packages";
import { PackageDetails, Purchase } from "../screens/Purchase";
import {
  About,
  CustomerProfile,
  Family,
  Membership,
  MoreServices,
  Profile,
} from "../screens/Account";
import {
  HospitalDetails,
  Kyc,
  Privacy,
  Products,
  Support,
} from "../screens/Portal";
import { Bmi, Breathing, Tracker } from "../screens/Wellness";
import {
  AppointmentPreview,
  Catalog,
  CatalogDetail,
  Notifications,
  OrderTracking,
  Payment,
  Records,
} from "../screens/Demo";
import { destination } from "../lib/navigation";
import Dashboard from "../screens/Dashboard";
import AccountDetails from "../screens/AccountDetails";
import LiveWallet from "../screens/Wallet";
import { AccountManagement } from "../screens/AccountManagement";

export default function Screen() {
  const params = useLocalSearchParams<{
    path: string[];
    id?: string;
    productId?: string;
    kind?: string;
    hospitalId?: string;
    purchase?: string;
  }>();
  const segments = Array.isArray(params.path) ? params.path : [params.path];
  const path = String(destination("/" + segments.join("/")));
  const id = params.id ?? segments[1] ?? "";
  if (segments[0] === "purchase")
    return (
      <Purchase
        key={segments.join("/")}
        orderId={segments[1]}
        step={segments[2]}
      />
    );
  if (segments[0] === "policies") return <Membership policyId={segments[1]} />;
  if (segments[0] === "doctor") return <CatalogDetail kind="doctors" id={id} />;
  switch (path) {
    case "/home":
      return <Dashboard />;
    case "/hospitals":
      return <Hospitals />;
    case "/hospital-details":
      return <HospitalDetails id={params.hospitalId ?? id} />;
    case "/book-service":
      return <BookService />;
    case "/packages":
      return <Packages />;
    case "/product-details":
      return params.purchase === "1" ? (
        <PackageDetails productId={params.productId ?? id} />
      ) : (
        <Products id={params.productId ?? id} />
      );
    case "/profile":
      return <Profile />;
    case "/account-details":
      return <AccountDetails />;
    case "/account-management":
      return <AccountManagement />;
    case "/customer-profile":
      return <CustomerProfile />;
    case "/family":
      return <Family />;
    case "/membership":
      return <Membership />;
    case "/nominees":
      return <Membership nominees />;
    case "/bookings":
      return <Bookings />;
    case "/menu":
      return <MoreServices />;
    case "/products":
      return <Products />;
    case "/support":
      return <Support />;
    case "/privacy":
    case "/privacy-policy":
    case "/terms":
      return <Privacy />;
    case "/kyc":
    case "/kyc-verification":
      return <Kyc />;
    case "/about":
    case "/aboutus":
      return <About />;
    case "/bmi":
      return <Bmi />;
    case "/breathing":
      return <Breathing />;
    case "/steps":
      return <Tracker kind="steps" />;
    case "/nutrition":
      return <Tracker kind="nutrition" />;
    case "/wallet":
      return <LiveWallet />;
    case "/notifications":
      return <Notifications />;
    case "/records":
      return <Records />;
    case "/doctors":
    case "/lab-tests":
    case "/pharmacy":
      return <Catalog kind={segments[0]} />;
    case "/catalog-detail":
      return <CatalogDetail kind={params.kind ?? ""} id={id} />;
    case "/book-appointment":
      return <AppointmentPreview />;
    case "/payment":
      return <Payment />;
    case "/order-tracking":
      return <OrderTracking />;
    default:
      return <Redirect href="/home" />;
  }
}
