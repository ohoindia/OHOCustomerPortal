import { useState } from "react";
import { Linking, Text } from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import {
  selectHospitals,
  hospitalCoordinates,
  hospitalDirectionsUrl,
  distanceInKm,
  type Coordinates,
  type HospitalProximity,
} from "../../../common/utils/hospitals";
import {
  Button,
  Card,
  Copy,
  Field,
  Heading,
  Page,
  Status,
  s,
} from "../components/ui";
import { useData, value, type Row } from "../lib/data";
import { Choice } from "../components/Choice";
import HospitalMap from "../components/HospitalMap";
export default function Hospitals({
  initialMap = false,
}: { initialMap?: boolean } = {}) {
  const data = useData<Row[]>("api/Hospital/all", { skip: 0, take: 0 });
  const [search, setSearch] = useState("");
  const [speciality, setSpeciality] = useState("all");
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [proximity, setProximity] = useState<HospitalProximity>("all");
  const [map, setMap] = useState(initialMap);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const rows = selectHospitals(data.data ?? [], {
    search,
    speciality,
    position,
    proximity,
  });
  async function locate(next: HospitalProximity) {
    if (next === "all" || position) {
      setProximity(next);
      return;
    }
    setLocating(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Location access was denied. You can still browse all hospitals.",
        );
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setPosition(result.coords);
      setProximity(next);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to find your location.",
      );
    } finally {
      setLocating(false);
    }
  }
  return (
    <Page title="Hospitals">
      <Field
        label="Search hospitals"
        placeholder="Hospital, city or speciality"
        value={search}
        onChangeText={setSearch}
      />
      <Choice
        label="View hospitals"
        options={["List", "Map"]}
        selected={map ? "Map" : "List"}
        onSelect={(mode) => setMap(mode === "Map")}
      />
      <Choice
        label="Distance"
        options={["All hospitals", "Nearest 2", "Within 10 km"]}
        selected={
          proximity === "all"
            ? "All hospitals"
            : proximity === "nearest"
              ? "Nearest 2"
              : "Within 10 km"
        }
        disabled={locating}
        onSelect={(mode) =>
          void locate(
            mode === "All hospitals"
              ? "all"
              : mode === "Nearest 2"
                ? "nearest"
                : "nearby",
          )
        }
      />
      <Choice
        label="Speciality"
        options={[
          "All",
          ...new Set(
            (data.data ?? [])
              .map((row) => value(row, "Specialization"))
              .filter(Boolean),
          ),
        ]}
        selected={speciality === "all" ? "All" : speciality}
        onSelect={(item) => setSpeciality(item === "All" ? "all" : item)}
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Status {...data} empty={!rows.length} />
      {map && rows.length > 0 && (
        <HospitalMap rows={rows} position={position} />
      )}
      {rows.map((row, i) => {
        const coords = hospitalCoordinates(row);
        return (
          <Card key={value(row, "HospitalId") || i}>
            <Heading>{value(row, "HospitalName")}</Heading>
            <Copy>
              {[
                value(row, "AddressLine1"),
                value(row, "City"),
                value(row, "Specialization"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Copy>
            {coords && position && (
              <Copy>{distanceInKm(position, coords).toFixed(1)} km away</Copy>
            )}
            <Button
              title="Hospital details"
              secondary
              onPress={() =>
                router.push({
                  pathname: "/hospital-details",
                  params: { id: value(row, "HospitalId") },
                })
              }
            />
            <Button
              title="Directions"
              secondary
              onPress={() => void Linking.openURL(hospitalDirectionsUrl(row))}
            />
            <Button
              title="Book service"
              onPress={() =>
                router.push({
                  pathname: "/book-service",
                  params: { hospitalId: value(row, "HospitalId") },
                })
              }
            />
          </Card>
        );
      })}
    </Page>
  );
}
