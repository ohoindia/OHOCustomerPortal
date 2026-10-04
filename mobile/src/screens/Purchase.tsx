import { useLocalSearchParams } from "expo-router";
import { packageDetailsRoute, purchaseRoute } from "../../../common";
import type { PurchaseStep } from "../../../common";
import Client from "./Client";

export function PackageDetails({ productId }: { productId: string }) {
  const route = packageDetailsRoute(productId);
  return <Client key={route} initialRoute={route} />;
}

export function ProductDetailsRoute() {
  const params = useLocalSearchParams<{
    productId?: string;
    id?: string;
    purchase?: string;
  }>();
  const productId = params.productId ?? params.id ?? "";
  const route =
    params.purchase === "1"
      ? packageDetailsRoute(productId)
      : `/product-details?productId=${encodeURIComponent(productId)}`;
  return <Client key={route} initialRoute={route} />;
}

export function PurchaseRoute() {
  const { orderId, step, review } = useLocalSearchParams<{
    orderId: string;
    step: string;
    review?: string;
  }>();
  const selected: PurchaseStep =
    step === "family" || step === "nominees" ? step : "payment";
  const route =
    purchaseRoute(orderId, selected) + (review === "1" ? "?review=1" : "");
  return <Client key={route} initialRoute={route} />;
}
