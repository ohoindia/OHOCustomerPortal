import { Text, View } from "react-native";
import {
  consultationSavings,
  walletBalances,
  savingsCurrency,
  LAB_MEDICINE_BENEFIT_VALUE,
} from "../../../common/utils/savings";
import { translate } from "../lib/localization";
import type { Row } from "../lib/data";
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
        <Text
          style={{
            color: "#fff",
            fontFamily: "InterSemiBold",
            fontSize: 12,
            flex: 1,
          }}
        >
          {translate("Available health benefits")}
        </Text>
        <Text
          style={{
            color: "#fff",
            backgroundColor: "#ffffff16",
            paddingVertical: 5,
            paddingHorizontal: 8,
            borderWidth: 1,
            borderColor: "#ffffff25",
            flexShrink: 1,
            borderRadius: 6,
            fontSize: 10,
          }}
        >
          {translate("Family account")}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 14 }}>
        <View style={{ flex: 1.1, minWidth: 0, gap: 8 }}>
          <Text style={{ color: "#d1e5f4", fontFamily: "Inter", fontSize: 11 }}>
            <Text
              style={{ fontFamily: "JakartaBold", fontSize: 26, color: "#fff" }}
            >
              {remaining}
            </Text>{" "}
            {translate("Available OPDs")}
          </Text>
          <Text
            style={{
              fontFamily: "JakartaBold",
              color: "#fff",
              fontSize: 26,
              fontVariant: ["tabular-nums"],
            }}
          >
            {savingsCurrency(balance.consultation)}
          </Text>
          <Text style={{ color: "#c1d8e9", fontFamily: "Inter", fontSize: 11 }}>
            {String(summary?.usedOpds ?? 0)} {translate("used")} ·{" "}
            {String(summary?.totalOpds ?? 0)} {translate("included")}
          </Text>
          <Text style={{ color: "#c1d8e9", fontFamily: "Inter", fontSize: 11 }}>
            {savingsCurrency(500)} {translate("benefit per OPD visit")}
          </Text>
        </View>
        <View
          style={{
            flex: 0.9,
            minWidth: 0,
            gap: 8,
            borderLeftWidth: 1,
            borderColor: "#ffffff30",
            paddingLeft: 14,
          }}
        >
          <Text style={{ color: "#d1e5f4", fontFamily: "Inter", fontSize: 11 }}>
            {translate("Lab & medicine subsidy")}
          </Text>
          <Text
            style={{
              fontFamily: "JakartaBold",
              color: "#fff",
              fontSize: 26,
              fontVariant: ["tabular-nums"],
            }}
          >
            {savingsCurrency(balance.labAndMedicines)}
          </Text>
          <Text style={{ color: "#c1d8e9", fontFamily: "Inter", fontSize: 11 }}>
            {translate("Shared allowance")} ·{" "}
            {savingsCurrency(LAB_MEDICINE_BENEFIT_VALUE)}
          </Text>
        </View>
      </View>
      {summary?.cardValid === false && (
        <Text style={{ color: "#f9dfa5", fontSize: 12 }}>
          {translate("An active card is required to use remaining benefits.")}
        </Text>
      )}
    </View>
  );
}
