import { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { Button, Card, Copy, Heading, Page, Status, s } from "../components/ui";
import { useData, value, type Row } from "../lib/data";
import { translate } from "../lib/localization";
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
  const [locating, setLocating] = useState(true);
  const locationRequest = useRef(0);
  const [sheet, setSheet] = useState(false);
  const specialities = [
    ...new Set(
      (data.data ?? [])
        .map((row) => value(row, "Specialization"))
        .filter(Boolean),
    ),
  ].sort();
  const rows = selectHospitals(data.data ?? [], {
    search,
    speciality,
    position,
    proximity,
  });
  const refreshLocation = useCallback(async () => {
    const request = ++locationRequest.current;
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
      if (request === locationRequest.current) setPosition(result.coords);
      return result.coords;
    } catch (e) {
      if (request === locationRequest.current)
        setError(
          e instanceof Error ? e.message : "Unable to find your location.",
        );
    } finally {
      if (request === locationRequest.current) setLocating(false);
    }
    return null;
  }, []);
  useEffect(() => {
    const requests = locationRequest;
    let active = true;
    queueMicrotask(() => {
      if (active) void refreshLocation();
    });
    return () => {
      active = false;
      requests.current++;
    };
  }, [refreshLocation]);
  async function locate(next: HospitalProximity) {
    if (next === "all" || position) {
      setProximity(next);
      return;
    }
    if (await refreshLocation()) setProximity(next);
  }
  function clearFilters() {
    setSearch("");
    setSpeciality("all");
    setProximity("all");
  }
  return (
    <Page title="Hospitals">
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>{translate("HOSPITAL NETWORK")}</Text>
        <Text style={styles.title}>{translate("Find care near you")}</Text>
        <Copy>
          Explore hospitals, compare specialities and book your next visit.
        </Copy>
      </View>
      <View style={styles.controls}>
        <View style={styles.segment}>
          {([false, true] as const).map((isMap) => (
            <Pressable
              key={String(isMap)}
              accessibilityRole="button"
              accessibilityState={{ selected: map === isMap }}
              onPress={() => setMap(isMap)}
              style={[
                styles.segmentButton,
                map === isMap && styles.segmentActive,
              ]}
            >
              <Ionicons
                name={isMap ? "map-outline" : "list-outline"}
                size={17}
                color={map === isMap ? "#007ca8" : "#64748b"}
              />
              <Text
                style={[styles.controlText, map === isMap && styles.activeText]}
              >
                {translate(isMap ? "Map view" : "List view")}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={20} color="#64748b" />
          <TextInput
            accessibilityLabel={translate("Search hospitals")}
            placeholder={translate("Hospital, city or speciality")}
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
          {!!search && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translate("Clear search")}
              onPress={() => setSearch("")}
              style={styles.iconButton}
            >
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${translate("Speciality")}: ${translate(speciality === "all" ? "All specialities" : speciality)}`}
          onPress={() => setSheet(true)}
          style={styles.filter}
        >
          <Ionicons name="options-outline" size={18} color="#007ca8" />
          <Text numberOfLines={1} style={[styles.controlText, { flex: 1 }]}>
            {translate(speciality === "all" ? "All specialities" : speciality)}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </Pressable>
        <View style={styles.proximity}>
          {(
            [
              ["all", "All hospitals"],
              ["nearest", "Nearest 2"],
              ["nearby", "Within 10 km"],
            ] as const
          ).map(([option, label]) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{
                selected: proximity === option,
                disabled: locating,
              }}
              disabled={locating}
              onPress={() => void locate(option)}
              style={[
                styles.chip,
                proximity === option && styles.chipActive,
                locating && { opacity: 0.5 },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  proximity === option && styles.activeText,
                ]}
              >
                {translate(label)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={locating}
          accessibilityState={{ disabled: locating }}
          onPress={() => void refreshLocation()}
          style={styles.location}
        >
          <Ionicons name="locate-outline" size={18} color="#007ca8" />
          <Text style={styles.link}>
            {translate(
              locating
                ? "Locating…"
                : position
                  ? "Update my location"
                  : "Use my location",
            )}
          </Text>
        </Pressable>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Status {...data} />
      {!data.loading && !data.error && (
        <View style={styles.resultHeading}>
          <Heading>
            {rows.length}{" "}
            {translate(
              rows.length === 1 ? "hospital found" : "hospitals found",
            )}
          </Heading>
          {position && (
            <Text style={styles.meta}>{translate("Sorted by distance")}</Text>
          )}
        </View>
      )}
      {!data.loading && !data.error && !rows.length && (
        <Card>
          <Heading>No hospitals found</Heading>
          <Copy>Try a different search, speciality or distance filter.</Copy>
          <Button title="Clear filters" secondary onPress={clearFilters} />
        </Card>
      )}
      {map && rows.length > 0 && (
        <HospitalMap rows={rows} position={position} />
      )}
      {rows.map((row, i) => {
        const coords = hospitalCoordinates(row);
        return (
          <View style={styles.hospitalCard} key={value(row, "HospitalId") || i}>
            <View style={styles.cardHeading}>
              <View style={styles.hospitalIcon}>
                <Ionicons name="medical" size={25} color="#007ca8" />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Heading>
                  {value(row, "HospitalName") || translate("Hospital")}
                </Heading>
                {!!value(row, "Specialization") && (
                  <Text style={styles.speciality}>
                    {value(row, "Specialization")}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.address}>
              <Ionicons name="location-outline" size={17} color="#64748b" />
              <Text style={[s.copy, { flex: 1 }]}>
                {[
                  value(row, "AddressLine1"),
                  value(row, "AddressLine2"),
                  value(row, "City"),
                ]
                  .filter(Boolean)
                  .join(", ") || translate("Address not provided")}
              </Text>
            </View>
            <Text style={styles.distance}>
              {coords && position
                ? `${distanceInKm(position, coords).toFixed(1)} ${translate("km away")}`
                : translate(
                    !coords
                      ? "Distance unavailable"
                      : locating
                        ? "Finding your location…"
                        : "Enable location to see distance",
                  )}
            </Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                style={styles.textAction}
                onPress={() =>
                  router.push({
                    pathname: "/hospital-details",
                    params: { id: value(row, "HospitalId") },
                  })
                }
              >
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#007ca8"
                />
                <Text style={styles.link}>{translate("Details")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.textAction}
                onPress={() => void Linking.openURL(hospitalDirectionsUrl(row))}
              >
                <Ionicons name="navigate-outline" size={18} color="#007ca8" />
                <Text style={styles.link}>{translate("Directions")}</Text>
              </Pressable>
            </View>
            <Button
              title="Book service"
              onPress={() =>
                router.push({
                  pathname: "/book-service",
                  params: { hospitalId: value(row, "HospitalId") },
                })
              }
            />
          </View>
        );
      })}
      <Modal
        visible={sheet}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate("Close specialities")}
            style={StyleSheet.absoluteFill}
            onPress={() => setSheet(false)}
          />
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.resultHeading}>
              <Heading>Speciality</Heading>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={translate("Close specialities")}
                onPress={() => setSheet(false)}
                style={styles.iconButton}
              >
                <Ionicons name="close" size={24} color="#142344" />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              {["all", ...specialities].map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: speciality === item }}
                  onPress={() => {
                    setSpeciality(item);
                    setSheet(false);
                  }}
                  style={styles.option}
                >
                  <Text
                    style={[
                      s.copy,
                      { flex: 1 },
                      speciality === item && styles.activeText,
                    ]}
                  >
                    {translate(item === "all" ? "All specialities" : item)}
                  </Text>
                  {speciality === item && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#007ca8"
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Page>
  );
}
const styles = StyleSheet.create({
  intro: { backgroundColor: "#e7f6fb", borderRadius: 22, padding: 22, gap: 9 },
  eyebrow: {
    fontFamily: "InterSemiBold",
    fontSize: 10,
    letterSpacing: 1.8,
    color: "#28738a",
  },
  title: {
    fontFamily: "JakartaBold",
    fontSize: 25,
    lineHeight: 33,
    color: "#142344",
  },
  controls: { gap: 12 },
  segment: {
    flexDirection: "row",
    backgroundColor: "#edf2f6",
    borderRadius: 13,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  segmentActive: { backgroundColor: "white" },
  controlText: { fontFamily: "InterSemiBold", fontSize: 13, color: "#475569" },
  activeText: { color: "#007ca8", fontFamily: "InterSemiBold" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: "#dce5ec",
    borderRadius: 13,
    backgroundColor: "#f8fafc",
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    fontSize: 13,
    color: "#142344",
    paddingVertical: 12,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  filter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#dce5ec",
    borderRadius: 12,
  },
  proximity: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: "#e7f6fb", borderColor: "#b5deeb" },
  chipText: { fontSize: 12, fontFamily: "InterSemiBold", color: "#64748b" },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 44,
    alignSelf: "flex-start",
  },
  link: { fontSize: 12, fontFamily: "InterSemiBold", color: "#007ca8" },
  resultHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  meta: { fontSize: 11, color: "#64748b" },
  hospitalCard: {
    borderWidth: 1,
    borderColor: "#dfe8ee",
    borderRadius: 20,
    backgroundColor: "#fff",
    padding: 18,
    gap: 14,
  },
  cardHeading: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  hospitalIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#e7f6fb",
    alignItems: "center",
    justifyContent: "center",
  },
  speciality: { color: "#28738a", fontSize: 12, lineHeight: 18 },
  address: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  distance: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#eff8f4",
    color: "#237553",
    fontSize: 11,
    fontFamily: "InterSemiBold",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    borderTopWidth: 1,
    borderColor: "#edf2f6",
    paddingTop: 4,
  },
  textAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(20,35,68,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "75%",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#edf2f6",
  },
});
