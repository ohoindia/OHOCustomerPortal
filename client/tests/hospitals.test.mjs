import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./load-common.mjs";
const {
  hospitalCoordinates,
  distanceInKm,
  selectHospitals,
  hospitalDirectionsUrl,
} = loadModule("../../common/utils/hospitals.ts");
const hospitals = [
  {
    HospitalId: 1,
    HospitalName: "Near Hospital",
    Specialization: "Cardiac",
    City: "Hyderabad",
    Latitude: "17.4",
    Longitude: "78.5",
  },
  {
    HospitalId: 2,
    HospitalName: "Far Hospital",
    Specialization: "Ortho",
    Latitude: 18.4,
    Longitude: 78.5,
  },
  {
    HospitalId: 3,
    HospitalName: "Nearby Clinic",
    Specialization: "Cardiac",
    Latitude: 17.41,
    Longitude: 78.5,
  },
  {
    HospitalId: 4,
    HospitalName: "Missing Coordinates",
    Latitude: null,
    Longitude: "",
  },
];
const options = {
  search: "",
  speciality: "all",
  proximity: "all",
  position: { latitude: 17.4, longitude: 78.5 },
};
test("hospital map rejects missing, malformed and out-of-range coordinates while preserving valid zeroes", () => {
  for (const row of [
    {},
    { Latitude: "", Longitude: 10 },
    { Latitude: "17.4abc", Longitude: "78.5" },
    { Latitude: 91, Longitude: 20 },
    { Latitude: 0, Longitude: 181 },
    { Latitude: null, Longitude: 0 },
  ])
    assert.equal(hospitalCoordinates(row), null);
  assert.equal(
    hospitalCoordinates({ Latitude: "0", Longitude: "0" }).latitude,
    0,
  );
});
test("distance filters return nearest two and only hospitals within 10 km without mutating API data", () => {
  assert.equal(distanceInKm(options.position, options.position), 0);
  assert.ok(
    Math.abs(
      distanceInKm(
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 0 },
      ) - 111.19,
    ) < 0.1,
  );
  assert.deepEqual(
    Array.from(
      selectHospitals(hospitals, { ...options, proximity: "nearest" }),
      (row) => row.HospitalId,
    ),
    [1, 3],
  );
  assert.deepEqual(
    Array.from(
      selectHospitals(hospitals, { ...options, proximity: "nearby" }),
      (row) => row.HospitalId,
    ),
    [1, 3],
  );
  assert.deepEqual(
    hospitals.map((row) => row.HospitalId),
    [1, 2, 3, 4],
  );
  assert.equal(
    selectHospitals(hospitals, { ...options, position: null }).length,
    4,
  );
});
test("search and speciality filters compose with distance selection and directions use coordinates or address", () => {
  assert.deepEqual(
    Array.from(
      selectHospitals(hospitals, {
        ...options,
        search: " HYDERABAD ",
        speciality: "Cardiac",
      }),
      (row) => row.HospitalId,
    ),
    [1],
  );
  assert.equal(
    selectHospitals(hospitals, { ...options, search: "Not found" }).length,
    0,
  );
  assert.ok(
    hospitalDirectionsUrl(hospitals[0]).includes("destination=17.4%2C78.5"),
  );
  assert.ok(
    hospitalDirectionsUrl({ HospitalName: "A&B", City: "City" }).includes(
      "A%26B%2C%20City",
    ),
  );
});
