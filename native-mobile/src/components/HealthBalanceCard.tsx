import { Text, View } from "react-native";
import {
  consultationSavings,
  walletBalances,
  savingsCurrency,
  LAB_MEDICINE_BENEFIT_VALUE,
} from "../../../common/utils/savings";
import { translate } from "../lib/localization";
import type { Row } from "../lib/data";
import { colors } from "./ui";
export default function HealthBalanceCard({
  summary,
  rows,
}: {
  summary?: Row;
  rows: Row[];
}) {
  const remaining = Number(summary?.availableOpds ?? 0);
  const balance = walletBalances(remaining, consultationSavings(rows));
  return (
    <View
      style={{
        backgroundColor: "#008ec6",
        borderRadius: 16,
        padding: 20,
        gap: 20,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
          {translate("Available health benefits")}
        </Text>
        <Text
          style={{
            color: "#fff",
            backgroundColor: "#ffffff16",
            padding: 6,
            borderRadius: 6,
            fontSize: 10,
          }}
        >
          {translate("Family account")}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 14 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={{ color: "#b8dfec" }}>
            {remaining} {translate("Available OPDs")}
          </Text>
          <Text style={{ fontWeight: "800", color: "#fff", fontSize: 26 }}>
            {savingsCurrency(balance.consultation)}
          </Text>
          <Text style={{ color: "#b8dfec", fontSize: 11 }}>
            {String(summary?.usedOpds ?? 0)} {translate("used")} ·{" "}
            {String(summary?.totalOpds ?? 0)} {translate("included")}
          </Text>
          <Text style={{ color: "#b8dfec", fontSize: 11 }}>
            ₹500 {translate("benefit per OPD visit")}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            gap: 8,
            borderLeftWidth: 1,
            borderColor: "#ffffff30",
            paddingLeft: 14,
          }}
        >
          <Text style={{ color: "#b8dfec" }}>
            {translate("Lab & medicine subsidy")}
          </Text>
          <Text style={{ fontWeight: "800", color: "#fff", fontSize: 26 }}>
            {savingsCurrency(balance.labAndMedicines)}
          </Text>
          <Text style={{ color: "#b8dfec", fontSize: 11 }}>
            {translate("Shared allowance")} ·{" "}
            {savingsCurrency(LAB_MEDICINE_BENEFIT_VALUE)}
          </Text>
        </View>
      </View>
      {summary?.cardValid === false && (
        <Text style={{ color: colors.line, fontSize: 12 }}>
          {translate("An active card is required to use remaining benefits.")}
        </Text>
      )}
    </View>
  );
}
