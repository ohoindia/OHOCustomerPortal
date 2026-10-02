import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { AppShell, PageHeader } from "../../components/Layout";
import { usePortalData, textValue } from "../portal/usePortalData";
import {
  hospitalCoordinates,
  distanceInKm,
  hospitalDirectionsUrl,
  selectHospitals,
} from "../../../../common/utils/hospitals";
import type {
  Coordinates,
  HospitalProximity,
} from "../../../../common/utils/hospitals";
import { HospitalMap } from "./HospitalMap";
import "./hospitals.css";

export function HospitalDirectory() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const state = location.state as {
    isFromBookService?: boolean;
    hospital?: { HospitalId?: number };
  } | null;
  const isBooking =
    state?.isFromBookService === true || params.get("bookService") === "1";
  const singleId =
    location.pathname.toLowerCase() === "/hospital-map"
      ? params.get("hospitalId") || String(state?.hospital?.HospitalId || "")
      : "";
  const view =
    params.get("view") ||
    (["/network", "/hospital-map"].includes(location.pathname.toLowerCase())
      ? "map"
      : "list");
  const data = usePortalData("api/Hospital/all", { skip: 0, take: 0 });
  const [search, setSearch] = useState("");
  const [speciality, setSpeciality] = useState("all");
  const [proximity, setProximity] = useState<HospitalProximity>("all");
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const specialities = [
    ...new Set(
      data.rows.map((row) => textValue(row, "Specialization")).filter(Boolean),
    ),
  ].sort();
  const filtered = useMemo(
    () =>
      selectHospitals(
        singleId
          ? data.rows.filter((row) => String(row.HospitalId) === singleId)
          : data.rows,
        { search, speciality, proximity, position },
      ),
    [data.rows, singleId, search, speciality, proximity, position],
  );
  function setView(next: string) {
    const nextParams = new URLSearchParams(params);
    nextParams.set("view", next);
    if (isBooking) nextParams.set("bookService", "1");
    setParams(nextParams, { replace: true, state: location.state });
  }
  function locate(next: HospitalProximity = proximity) {
    if (!navigator.geolocation) {
      setLocationError(
        "Your browser does not support location. You can still search all hospitals.",
      );
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        });
        setProximity(next);
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === 1
            ? "Location access was denied. Allow it in your browser to see distances and nearby hospitals."
            : "Unable to find your location. Please try again; all hospitals remain available.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }
  function changeProximity(next: HospitalProximity) {
    if (next !== "all" && !position) locate(next);
    else setProximity(next);
  }
  return (
    <AppShell className="hospital-directory">
      <PageHeader
        title={isBooking ? "Book Service · Choose Hospital" : "Hospitals"}
      />
      <div className="hospital-directory-content">
        <div
          className="hospital-view-toggle"
          role="group"
          aria-label="Hospital view"
        >
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            ☷ List view
          </button>
          <button
            type="button"
            aria-pressed={view === "map"}
            onClick={() => setView("map")}
          >
            ⌖ Map view
          </button>
        </div>
        <label className="hospital-search">
          <span className="sr-only">Search hospitals</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search hospitals, city or speciality..."
          />
        </label>
        <div className="hospital-filter-row">
          <label>
            Speciality
            <select
              aria-label="Speciality"
              value={speciality}
              onChange={(event) => setSpeciality(event.target.value)}
            >
              <option value="all">All specialities</option>
              {specialities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <button
            className="hospital-location-button"
            disabled={locating}
            onClick={() => locate()}
          >
            {locating
              ? "Locating..."
              : position
                ? "Update my location"
                : "Use my location"}
          </button>
        </div>
        <div
          className="hospital-proximity"
          role="group"
          aria-label="Hospital distance filter"
        >
          {(["all", "nearest", "nearby"] as const).map((value) => (
            <button
              type="button"
              key={value}
              disabled={locating}
              aria-pressed={proximity === value}
              onClick={() => changeProximity(value)}
            >
              {value === "all"
                ? "All hospitals"
                : value === "nearest"
                  ? "Nearest 2"
                  : "Nearby · 10 km"}
            </button>
          ))}
        </div>
        {locationError && (
          <p className="hospital-status" role="status">
            {locationError}
          </p>
        )}
        {data.loading ? (
          <p role="status">Loading hospitals...</p>
        ) : data.error ? (
          <div role="alert">
            <p>{data.error}</p>
            <button className="outline-btn" onClick={data.retry}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <p className="hospital-result-count" role="status">
              {filtered.length} hospital{filtered.length === 1 ? "" : "s"} found
              {position ? " · Sorted by distance" : ""}
            </p>
            {view === "map" ? (
              <HospitalMap
                hospitals={filtered}
                position={position}
                isBooking={isBooking}
              />
            ) : (
              <div className="hospital-results">
                {filtered.map((row) => {
                  const id = textValue(row, "HospitalId");
                  const coords = hospitalCoordinates(row);
                  const distance =
                    coords && position ? distanceInKm(position, coords) : null;
                  const destination = `/${isBooking ? "hospitalService" : "hospitalDetails"}?hospitalId=${id}`;
                  return (
                    <article className="hospital-directory-card" key={id}>
                      <div className="hospital-card-heading">
                        <span className="hospital-building" aria-hidden="true">
                          ✚
                        </span>
                        <div>
                          <Link to={destination} className="hospital-name">
                            {textValue(row, "HospitalName")}
                          </Link>
                          {textValue(row, "Specialization") && (
                            <p className="hospital-speciality">
                              {textValue(row, "Specialization")}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="hospital-address">
                        ⌖{" "}
                        {[
                          textValue(row, "AddressLine1"),
                          textValue(row, "AddressLine2"),
                          textValue(row, "City"),
                        ]
                          .filter(Boolean)
                          .join(", ") || "Address not provided"}
                      </p>
                      {distance !== null && (
                        <span className="hospital-distance">
                          {distance.toFixed(2)} km away
                        </span>
                      )}
                      <div className="hospital-card-actions">
                        <Link
                          className="hospital-primary-link"
                          to={`/hospitalService?hospitalId=${id}`}
                        >
                          Book Service
                        </Link>
                        <Link to={`/hospitalDetails?hospitalId=${id}`}>
                          Details
                        </Link>
                        {coords && (
                          <Link
                            to={`/hospital-map?hospitalId=${id}${isBooking ? "&bookService=1" : ""}`}
                            state={location.state}
                          >
                            Map
                          </Link>
                        )}
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={hospitalDirectionsUrl(row)}
                        >
                          Directions ↗
                        </a>
                        {textValue(row, "MobileNumber") && (
                          <a
                            href={`tel:${textValue(row, "MobileNumber").replace(/[^+\d]/g, "")}`}
                          >
                            Call
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {!filtered.length && (
              <div className="hospital-empty">
                <h2>No hospitals found</h2>
                <p>Try a different search, speciality or distance filter.</p>
                <button
                  className="outline-btn"
                  onClick={() => {
                    setSearch("");
                    setSpeciality("all");
                    setProximity("all");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
