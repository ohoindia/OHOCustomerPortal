import { router, useLocalSearchParams } from "expo-router";
import { Membership } from "./Account";
import { Catalog, CatalogDetail } from "./Demo";
import { HospitalDetails, Products } from "./Portal";
import Hospitals from "./Hospitals";
import { ProductDetailsRoute } from "./Purchase";
import { Tracker } from "./Wellness";
import { Button, Copy, Page } from "../components/ui";
export function HospitalDetailsRoute() {
  const params = useLocalSearchParams<{
    id?: string;
    hospitalId?: string;
    HospitalId?: string;
  }>();
  const id = params.hospitalId ?? params.HospitalId ?? params.id ?? "";
  return Number.isSafeInteger(Number(id)) && Number(id) > 0 ? (
    <HospitalDetails id={id} />
  ) : (
    <Page title="Hospital details">
      <Copy>Select a hospital to view its details.</Copy>
      <Button
        title="Choose hospital"
        onPress={() => router.replace("/hospitals")}
      />
    </Page>
  );
}
export function HospitalMapRoute() {
  return <Hospitals initialMap />;
}
export function ProductRoute() {
  const params = useLocalSearchParams<{
    productId?: string;
    id?: string;
    purchase?: string;
  }>();
  return params.purchase === "1" ? (
    <ProductDetailsRoute />
  ) : (
    <Products id={params.productId ?? params.id ?? ""} />
  );
}
export function NomineesRoute() {
  return <Membership nominees />;
}
export function PolicyRoute() {
  const { policyId } = useLocalSearchParams<{ policyId: string }>();
  return <Membership policyId={policyId} />;
}
export function StepsRoute() {
  return <Tracker kind="steps" />;
}
export function NutritionRoute() {
  return <Tracker kind="nutrition" />;
}
export function DoctorsRoute() {
  return <Catalog kind="doctors" />;
}
export function LabsRoute() {
  return <Catalog kind="lab-tests" />;
}
export function PharmacyRoute() {
  return <Catalog kind="pharmacy" />;
}
export function DoctorRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CatalogDetail kind="doctors" id={id} />;
}
export function CatalogRoute() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  return <CatalogDetail kind={kind} id={id} />;
}
