import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  groupPackages,
  packageAmount,
  packageDetailsRoute,
} from "../../../common";
import { Copy, Heading, Page, Status } from "../components/ui";
import { translate } from "../lib/localization";
import { useData, value, type Row } from "../lib/data";
import { money, plainText } from "../lib/purchase";
const tones = [
  ["#087da6", "#eaf7fc"],
  ["#4260a1", "#edf1fa"],
  ["#7560a1", "#f3effa"],
  ["#967025", "#faf4e7"],
  ["#267568", "#eaf6f2"],
  ["#576b81", "#edf2f7"],
];
export default function Packages() {
  const data = useData<Row[]>("api/Products/all", { skip: 0, take: 0 });
  const groups = groupPackages(data.data ?? []);
  return (
    <Page title="Packages">
      <View style={d.intro}>
        <View style={d.art}>
          <Feather name="shield" size={110} color="#0094c6" />
        </View>
        <Text style={d.eyebrow}>{translate("OHOINDIA HEALTH PACKAGES")}</Text>
        <Text style={d.hero}>
          {translate("Care for you.")}
          {"\n"}
          {translate("Confidence for your family.")}
        </Text>
        <Copy>
          Explore health benefits and find a package that fits your needs.
        </Copy>
      </View>
      <Status {...data} />
      {!data.loading && !data.error && !groups.length && (
        <View style={d.card}>
          <Heading>More care is on the way</Heading>
          <Copy>
            No packages are available right now. Please check again soon.
          </Copy>
        </View>
      )}
      {groups.map((group, index) => {
        const [color, backgroundColor] = tones[index % tones.length];
        return (
          <View key={group.id} style={{ gap: 16, marginTop: 10 }}>
            <View style={d.row}>
              <Text style={d.category}>{group.name}</Text>
              <Text style={d.small}>
                {group.packages.length}{" "}
                {translate(
                  group.packages.length === 1 ? "package" : "packages",
                )}
              </Text>
            </View>
            {group.packages.map((product) => {
              const amount = packageAmount(product);
              const benefits = plainText(
                value(product, "LongDescription") ||
                  value(product, "KeyFeatures"),
              )
                .split(/\n|\.\s+/)
                .map((line) => line.trim())
                .filter(Boolean);
              const members = Number(product.MaximumMembers);
              const validity = Number(product.ValidForDays);
              return (
                <Pressable
                  key={value(product, "ProductsId")}
                  accessibilityRole="button"
                  accessibilityLabel={value(product, "ProductName")}
                  style={d.card}
                  onPress={() =>
                    router.push(
                      packageDetailsRoute(value(product, "ProductsId")),
                    )
                  }
                >
                  <View style={d.row}>
                    <Text style={[d.badge, { color, backgroundColor }]}>
                      {group.name.toUpperCase()}
                    </Text>
                    <View style={[d.symbol, { backgroundColor }]}>
                      <Feather name="shield" size={21} color={color} />
                    </View>
                  </View>
                  <Text style={d.name}>{value(product, "ProductName")}</Text>
                  {!!value(product, "ShortDescription") && (
                    <Text style={d.description}>
                      {value(product, "ShortDescription")}
                    </Text>
                  )}
                  <View
                    style={[
                      d.row,
                      {
                        justifyContent: "flex-start",
                        flexWrap: "wrap",
                        gap: 7,
                      },
                    ]}
                  >
                    {members > 0 && (
                      <Text style={d.meta}>
                        {translate("Up to ")}
                        {members}{" "}
                        {translate(members === 1 ? "member" : "members")}
                      </Text>
                    )}
                    {validity > 0 && (
                      <Text style={d.meta}>
                        {validity}
                        {translate(" days validity")}
                      </Text>
                    )}
                  </View>
                  {benefits.slice(0, 3).map((line, i) => (
                    <View key={i} style={{ flexDirection: "row", gap: 9 }}>
                      <Text style={{ color: "#168572" }}>✓</Text>
                      <Text style={d.benefit}>{translate(line)}</Text>
                    </View>
                  ))}
                  {benefits.length > 3 && (
                    <Text style={d.small}>
                      +{benefits.length - 3}
                      {translate(" more benefits")}
                    </Text>
                  )}
                  <View style={[d.row, d.footer]}>
                    <View>
                      {amount !== null && (
                        <>
                          <Text style={d.small}>
                            {translate("Package price")}
                          </Text>
                          <Text style={d.price}>{money(amount)}</Text>
                        </>
                      )}
                    </View>
                    <Text style={d.cta}>{translate("Purchase ")} ↗</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </Page>
  );
}
const d = StyleSheet.create({
  intro: {
    padding: 22,
    gap: 12,
    backgroundColor: "#e9f7fc",
    borderWidth: 1,
    borderColor: "#d6eaf3",
    borderRadius: 22,
    overflow: "hidden",
  },
  art: {
    position: "absolute",
    right: -18,
    top: 45,
    opacity: 0.09,
    transform: [{ rotate: "12deg" }],
  },
  eyebrow: {
    color: "#08799e",
    fontFamily: "InterSemiBold",
    fontSize: 10,
    letterSpacing: 1.4,
  },
  hero: {
    fontFamily: "JakartaBold",
    color: "#142344",
    fontSize: 27,
    lineHeight: 34,
    letterSpacing: -0.8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  category: {
    fontFamily: "JakartaBold",
    fontSize: 18,
    color: "#142344",
    flexShrink: 1,
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e3eaf2",
    backgroundColor: "#fff",
    gap: 14,
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
    fontSize: 10,
    fontFamily: "InterSemiBold",
    flexShrink: 1,
  },
  symbol: { padding: 6, borderRadius: 10 },
  name: {
    fontFamily: "JakartaBold",
    fontSize: 16,
    lineHeight: 24,
    color: "#142344",
  },
  description: {
    fontFamily: "Inter",
    fontSize: 11,
    lineHeight: 19,
    color: "#6c7b8e",
  },
  meta: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e8edf3",
    borderRadius: 6,
    padding: 6,
    fontSize: 10,
    color: "#52657b",
  },
  benefit: {
    flex: 1,
    fontFamily: "Inter",
    fontSize: 12,
    lineHeight: 19,
    color: "#475b71",
  },
  small: { fontFamily: "Inter", fontSize: 11, color: "#718198" },
  footer: {
    borderTopWidth: 1,
    borderColor: "#edf1f6",
    paddingTop: 16,
    flexWrap: "wrap",
  },
  price: {
    fontFamily: "JakartaBold",
    fontSize: 25,
    color: "#142344",
    marginTop: 4,
  },
  cta: {
    padding: 12,
    borderRadius: 9,
    backgroundColor: "#edf8fc",
    color: "#087da6",
    fontFamily: "InterSemiBold",
    fontSize: 12,
  },
});
