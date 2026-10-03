import MapView, { Marker } from "react-native-maps";
import {
  hospitalCoordinates,
  type Coordinates,
} from "../../../common/utils/hospitals";
import { value, type Row } from "../lib/data";
import { Copy } from "./ui";
export default function HospitalMap({
  rows,
  position,
}: {
  rows: Row[];
  position: Coordinates | null;
}) {
  const valid = rows.flatMap((row) => {
    const coordinate = hospitalCoordinates(row);
    return coordinate ? [{ row, coordinate }] : [];
  });
  const center = position || valid[0]?.coordinate;
  if (!center)
    return (
      <Copy>
        No hospital coordinates available. Use the list to browse hospitals.
      </Copy>
    );
  return (
    <MapView
      key={`${center.latitude}:${center.longitude}`}
      style={{ height: 300, borderRadius: 18 }}
      initialRegion={{ ...center, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
      showsUserLocation={Boolean(position)}
    >
      {valid.map(({ row, coordinate }, i) => (
        <Marker
          key={value(row, "HospitalId") || i}
          coordinate={coordinate}
          title={value(row, "HospitalName")}
          description={value(row, "City")}
        />
      ))}
    </MapView>
  );
}
