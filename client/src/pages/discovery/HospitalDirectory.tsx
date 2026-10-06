import { UI_TEXT } from "../../../../common/content/labels";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [proximity, setProximity] = useState<HospitalProximity>(
    singleId ? "all" : "nearby",
  );
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(!singleId);
  const [locationError, setLocationError] = useState("");
  const locationRequest = useRef(0);
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
  const requestLocation = useCallback((next: HospitalProximity) => {
    const request = ++locationRequest.current;
    if (!navigator.geolocation) {
      queueMicrotask(() => {
        if (request !== locationRequest.current) return;
        setLocationError(UI_TEXT.yourBrowserDoesNotSupportLocationYouCanStill);
        setProximity("all");
        setLocating(false);
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (result) => {
        if (request !== locationRequest.current) return;
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        });
        setProximity(next);
        setLocating(false);
      },
      (error) => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        setProximity("all");
        setLocationError(
          error.code === 1
            ? UI_TEXT.locationAccessWasDeniedAllowItInYourBrowser
            : UI_TEXT.unableToFindYourLocationPleaseTryAgainAll,
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);
  function locate(next: HospitalProximity) {
    setLocating(true);
    setLocationError("");
    requestLocation(next);
  }
  useEffect(() => {
    const requests = locationRequest;
    // A selected hospital's map should stay visible even outside the nearby area.
    if (!singleId) requestLocation("nearby");
    return () => {
      requests.current++;
    };
  }, [singleId, requestLocation]);
  function changeProximity(next: HospitalProximity) {
    if (next !== "all" && !position) locate(next);
    else setProximity(next);
  }
  return (
    <AppShell className="hospital-directory">
      <PageHeader
        title={
          isBooking ? UI_TEXT.bookServiceChooseHospital : UI_TEXT.hospitals
        }
      />
      <div className="hospital-directory-content">
        <div
          className="hospital-view-toggle"
          role="group"
          aria-label={UI_TEXT.hospitalView}
        >
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            {UI_TEXT.listView}
          </button>
          <button
            type="button"
            aria-pressed={view === "map"}
            onClick={() => setView("map")}
          >
            {UI_TEXT.mapView}
          </button>
        </div>
        <label className="hospital-search">
          <span className="sr-only">{UI_TEXT.searchHospitals}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={UI_TEXT.searchHospitalsCityOrSpeciality}
          />
        </label>
        <div className="hospital-filter-row">
          <label>
            {UI_TEXT.speciality}
            <select
              aria-label={UI_TEXT.speciality}
              value={speciality}
              onChange={(event) => setSpeciality(event.target.value)}
            >
              <option value="all">{UI_TEXT.allSpecialities}</option>
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
            onClick={() => locate(proximity)}
          >
            {locating
              ? UI_TEXT.locating
              : position
                ? UI_TEXT.updateMyLocation
                : UI_TEXT.useMyLocation}
          </button>
        </div>
        <div
          className="hospital-proximity"
          role="group"
          aria-label={UI_TEXT.hospitalDistanceFilter}
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
                ? UI_TEXT.allHospitals
                : value === "nearest"
                  ? UI_TEXT.nearest2
                  : UI_TEXT.nearby10Km}
            </button>
          ))}
        </div>
        {locationError && (
          <p className="hospital-status" role="status">
            {locationError}
          </p>
        )}
        {locating && !position ? (
          <p role="status">{UI_TEXT.locating}</p>
        ) : data.loading ? (
          <p role="status">{UI_TEXT.loadingHospitals}</p>
        ) : data.error ? (
          <div role="alert">
            <p>{data.error}</p>
            <button className="outline-btn" onClick={data.retry}>
              {UI_TEXT.tryAgain}
            </button>
          </div>
        ) : (
          <>
            <p className="hospital-result-count" role="status">
              {filtered.length}
              {UI_TEXT.hospital}
              {filtered.length === 1 ? "" : UI_TEXT.pluralSuffix}
              {UI_TEXT.found}
              {position ? UI_TEXT.sortedByDistance : ""}
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
                          {UI_TEXT.medicalCrossIcon}
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
                        {UI_TEXT.locationIcon}{" "}
                        {[
                          textValue(row, "AddressLine1"),
                          textValue(row, "AddressLine2"),
                          textValue(row, "City"),
                        ]
                          .filter(Boolean)
                          .join(", ") || UI_TEXT.addressNotProvided}
                      </p>
                      {distance !== null && (
                        <span className="hospital-distance">
                          {distance.toFixed(2)}
                          {UI_TEXT.kmAway}
                        </span>
                      )}
                      <div className="hospital-card-actions">
                        <Link
                          className="hospital-primary-link"
                          to={`/hospitalService?hospitalId=${id}`}
                        >
                          {UI_TEXT.bookService}
                        </Link>
                        <Link to={`/hospitalDetails?hospitalId=${id}`}>
                          {UI_TEXT.details}
                        </Link>
                        {coords && (
                          <Link
                            to={`/hospital-map?hospitalId=${id}${isBooking ? "&bookService=1" : ""}`}
                            state={location.state}
                          >
                            {UI_TEXT.map}
                          </Link>
                        )}
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={hospitalDirectionsUrl(row)}
                        >
                          {UI_TEXT.directions}
                        </a>
                        {textValue(row, "MobileNumber") && (
                          <a
                            href={`tel:${textValue(row, "MobileNumber").replace(/[^+\d]/g, "")}`}
                          >
                            {UI_TEXT.call2}
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
                <h2>{UI_TEXT.noHospitalsFound}</h2>
                <p>{UI_TEXT.tryADifferentSearchSpecialityOrDistanceFilter}</p>
                <button
                  className="outline-btn"
                  onClick={() => {
                    setSearch("");
                    setSpeciality("all");
                    setProximity("all");
                  }}
                >
                  {UI_TEXT.clearFilters}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
