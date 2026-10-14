import { router } from "expo-router";
import { Text, View } from "react-native";
import {
  groupPackages,
  packageAmount,
  packageDetailsRoute,
} from "../../../common";
import {
  Button,
  Card,
  Copy,
  Heading,
  Page,
  Status,
  colors,
  s,
} from "../components/ui";
import { useData, value, type Row } from "../lib/data";
import { money, plainText } from "../lib/purchase";
export default function Packages() {
  const data = useData<Row[]>("api/Products/all", { skip: 0, take: 0 });
  const groups = groupPackages(data.data ?? []);
  return (
    <Page title="Packages">
      <View
        style={{
          padding: 24,
          gap: 12,
          backgroundColor: "#e3f5fc",
          borderRadius: 22,
        }}
      >
        <Text style={[s.label, { color: colors.brand }]}>
          OHOINDIA HEALTH PACKAGES
        </Text>
        <Heading>Care for you. Confidence for your family.</Heading>
        <Copy>
          Explore health benefits and find a package that fits your needs.
        </Copy>
      </View>
      <Status {...data} empty={!groups.length} />
      {groups.map((group) => (
        <View key={group.id} style={{ gap: 14 }}>
          <Heading>{group.name}</Heading>
          {group.packages.map((product) => {
            const amount = packageAmount(product);
            return (
              <Card key={value(product, "ProductsId")}>
                <Text style={[s.label, { color: colors.brand }]}>
                  {group.name} ◇
                </Text>
                <Heading>{value(product, "ProductName")}</Heading>
                <Copy>{value(product, "ShortDescription")}</Copy>
                <Copy>
                  Up to {value(product, "MaximumMembers")} members ·{" "}
                  {value(product, "ValidForDays")} days validity
                </Copy>
                {plainText(
                  value(product, "LongDescription") ||
                    value(product, "KeyFeatures"),
                )
                  .split("\n")
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((line, i) => (
                    <Copy key={i}>✓ {line}</Copy>
                  ))}
                {amount !== null && <Heading>{money(amount)}</Heading>}
                <Button
                  title="View benefits & purchase"
                  onPress={() =>
                    router.push(
                      packageDetailsRoute(value(product, "ProductsId")),
                    )
                  }
                />
              </Card>
            );
          })}
        </View>
      ))}
    </Page>
  );
}
