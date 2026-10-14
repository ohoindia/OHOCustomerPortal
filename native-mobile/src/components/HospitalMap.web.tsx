import { Linking } from "react-native";
import {
  hospitalDirectionsUrl,
  type Coordinates,
} from "../../../common/utils/hospitals";
import { value, type Row } from "../lib/data";
import { Button, Card, Copy } from "./ui";
export default function HospitalMap({
  rows,
}: {
  rows: Row[];
  position: Coordinates | null;
}) {
  return (
    <Card>
      <Copy>
        Interactive maps are available in the Android and iOS app. Open a
        hospital in Maps from this browser preview.
      </Copy>
      {rows.slice(0, 5).map((row, i) => (
        <Button
          key={i}
          title={value(row, "HospitalName")}
          secondary
          onPress={() => void Linking.openURL(hospitalDirectionsUrl(row))}
        />
      ))}
    </Card>
  );
}
