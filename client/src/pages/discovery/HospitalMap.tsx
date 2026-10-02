import { UI_TEXT, UI_MESSAGES } from "../../../../common/content/labels";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  hospitalCoordinates,
  hospitalDirectionsUrl,
} from "../../../../common/utils/hospitals";
import type {
  Coordinates,
  HospitalRow,
} from "../../../../common/utils/hospitals";
import "leaflet/dist/leaflet.css";

export function HospitalMap({
  hospitals,
  position,
  isBooking,
}: {
  hospitals: HospitalRow[];
  position: Coordinates | null;
  isBooking: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [mapError, setMapError] = useState("");
  const mappedCount = hospitals.filter((hospital) =>
    hospitalCoordinates(hospital),
  ).length;
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void import("leaflet")
      .then((L) => {
        if (cancelled || !container.current) return;
        const map = L.map(container.current, {
          scrollWheelZoom: false,
        }).setView([20.5937, 78.9629], 5);
        cleanup = () => map.remove();
        const tiles = L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              UI_TEXT.copyAHrefHttpsWwwOpenstreetmapOrgCopyrightOpenstreetmap,
          },
        ).addTo(map);
        tiles.on("tileerror", () => {
          if (!cancelled)
            setMapError(UI_TEXT.theMapBackgroundCouldNotLoadYouCanStill);
        });
        tiles.on("tileload", () => {
          if (!cancelled) setMapError("");
        });
        const bounds = L.latLngBounds([]);
        for (const hospital of hospitals) {
          const coords = hospitalCoordinates(hospital);
          if (!coords) continue;
          const point: [number, number] = [coords.latitude, coords.longitude];
          bounds.extend(point);
          const content = document.createElement("div");
          content.className = "hospital-map-popup";
          const title = document.createElement("strong");
          title.textContent = String(
            hospital.HospitalName ?? UI_TEXT.hospital2,
          );
          const address = document.createElement("p");
          address.textContent = [hospital.AddressLine1, hospital.City]
            .filter(Boolean)
            .join(", ");
          const details = document.createElement("button");
          details.type = "button";
          details.className = "hospital-popup-action";
          details.textContent = isBooking
            ? UI_TEXT.bookService
            : UI_TEXT.viewDetails2;
          details.addEventListener("click", () =>
            navigate(
              `/${isBooking ? "hospitalService" : "hospitalDetails"}?hospitalId=${hospital.HospitalId}`,
            ),
          );
          const book = document.createElement("button");
          book.type = "button";
          book.className = "hospital-popup-action";
          book.textContent = UI_TEXT.bookService;
          book.addEventListener("click", () =>
            navigate(`/hospitalService?hospitalId=${hospital.HospitalId}`),
          );
          const directions = document.createElement("a");
          directions.textContent = UI_TEXT.getDirections;
          directions.href = hospitalDirectionsUrl(hospital);
          directions.target = "_blank";
          directions.rel = "noreferrer";
          content.append(title, address, details);
          if (!isBooking) content.append(book);
          content.append(directions);
          const marker = L.marker(point, {
            title: String(hospital.HospitalName ?? UI_TEXT.hospital2),
            icon: L.divIcon({
              className: "hospital-map-pin",
              html: UI_TEXT.spanAriaHiddenTrueSpan,
              iconSize: [30, 38],
              iconAnchor: [15, 38],
            }),
          })
            .addTo(map)
            .bindPopup(content);
          const element = marker.getElement();
          if (element) {
            element.setAttribute("role", "button");
            element.setAttribute(
              "aria-label",
              UI_MESSAGES.showOnMap(
                hospital.HospitalName ?? UI_TEXT.hospitalFallback,
              ),
            );
          }
        }
        if (position) {
          const point: [number, number] = [
            position.latitude,
            position.longitude,
          ];
          L.circleMarker(point, {
            radius: 7,
            color: "#fff",
            weight: 3,
            fillColor: "#2563eb",
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip(UI_TEXT.yourLocation);
          bounds.extend(point);
        }
        if (bounds.isValid())
          map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
        const resize = new ResizeObserver(() => map.invalidateSize());
        resize.observe(container.current);
        cleanup = () => {
          resize.disconnect();
          map.remove();
        };
      })
      .catch(() => {
        if (!cancelled)
          setMapError(UI_TEXT.unableToLoadTheInteractiveMapPleaseUseList);
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [hospitals, position, isBooking, navigate]);
  return (
    <div className="hospital-map-panel">
      <div
        ref={container}
        className="hospital-map-canvas"
        role="region"
        aria-label={UI_TEXT.interactiveHospitalMap}
      />
      {mapError && (
        <p className="hospital-map-message" role="status">
          {mapError}
        </p>
      )}
      {!mappedCount && (
        <p role="status">
          {UI_TEXT.noHospitalsWithValidMapLocationsMatchYourFilters}
        </p>
      )}
      {hospitals.length > mappedCount && (
        <p className="hospital-map-message">
          {hospitals.length - mappedCount}
          {UI_TEXT.hospitalSHaveNoMapLocationFindThemIn}
        </p>
      )}
    </div>
  );
}
