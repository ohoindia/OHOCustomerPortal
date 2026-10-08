import { router } from "expo-router";
import {
  groupPackages,
  packageAmount,
  packageDetailsRoute,
} from "../../../common";
import { Button, Card, Copy, Heading, Page, Status } from "../components/ui";
import { useData, value, type Row } from "../lib/data";
export default function Packages() {
  const data = useData<Row[]>("api/Products/all", { skip: 0, take: 0 });
  const groups = groupPackages(data.data ?? []);
  return (
    <Page title="Packages">
      <Card>
        <Copy>OHOINDIA HEALTH PACKAGES</Copy>
        <Heading>Care for you.{"\n"}Confidence for your family.</Heading>
        <Copy>
          Explore health benefits and find a package that fits your needs.
        </Copy>
      </Card>
      <Status {...data} />
      {!data.loading && !data.error && !groups.length && (
        <Card>
          <Heading>More care is on the way</Heading>
          <Copy>
            No packages are available right now. Please check again soon.
          </Copy>
        </Card>
      )}
      {groups.map((group) => (
        <Card key={group.id}>
          <Heading>{group.name}</Heading>
          <Copy>{group.packages.length} packages</Copy>
          {group.packages.map((product) => (
            <Card key={value(product, "ProductsId")}>
              <Heading>{value(product, "ProductName")}</Heading>
              <Copy>{value(product, "ShortDescription")}</Copy>
              {Number(product.MaximumMembers) > 0 && (
                <Copy>Up to {String(product.MaximumMembers)} members</Copy>
              )}
              {Number(product.ValidForDays) > 0 && (
                <Copy>{String(product.ValidForDays)} days validity</Copy>
              )}
              {value(product, "LongDescription")
                .replace(
                  /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,
                  "",
                )
                .replace(/<[^>]+>/g, "\n")
                .replace(/&nbsp;/g, " ")
                .split(/\n|\.\s+/)
                .map((text) => text.trim())
                .filter(Boolean)
                .slice(0, 3)
                .map((text, i) => (
                  <Copy key={i}>✓ {text}</Copy>
                ))}
              <Copy>
                {packageAmount(product) === null
                  ? "See details for pricing"
                  : `₹${packageAmount(product)}`}
              </Copy>
              <Button
                title="Purchase ↗"
                onPress={() =>
                  router.push(
                    packageDetailsRoute(value(product, "ProductsId")) as never,
                  )
                }
              />
            </Card>
          ))}
        </Card>
      ))}
    </Page>
  );
}
