import { StyleSheet, Text, View } from "react-native";
import { getLocaleTag } from "../../../common/content/locale";
export default function DateBadge({
  value,
  time = false,
}: {
  value: string;
  time?: boolean;
}) {
  const date = new Date(value);
  const valid = !!value && Number.isFinite(date.getTime());
  const part = (options: Intl.DateTimeFormatOptions) =>
    valid
      ? new Intl.DateTimeFormat(getLocaleTag(), {
          ...options,
          timeZone: "Asia/Kolkata",
        }).format(date)
      : "—";
  return (
    <View style={d.badge}>
      <Text style={d.month}>{part({ month: "short" }).toUpperCase()}</Text>
      <Text style={d.day}>{part({ day: "2-digit" })}</Text>
      <Text style={d.small}>{part({ weekday: "short" })}</Text>
      {time && (
        <Text style={d.small}>
          {part({ hour: "numeric", minute: "2-digit", hour12: true })}
        </Text>
      )}
    </View>
  );
}
const d = StyleSheet.create({
  badge: {
    width: 62,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#e0edf4",
    borderRadius: 13,
    backgroundColor: "#f4f9fc",
    alignItems: "center",
    gap: 3,
  },
  month: {
    fontSize: 10,
    color: "#007ca8",
    fontFamily: "InterSemiBold",
    letterSpacing: 1,
  },
  day: { fontSize: 25, color: "#142344", fontFamily: "JakartaBold" },
  small: { fontSize: 10, color: "#64748b", textAlign: "center" },
});
