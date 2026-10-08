import { Image } from "react-native";
import { router } from "expo-router";
import {
  cardStatus,
  expiryStatus,
  formatHomeDate,
  UI_TEXT,
  customerProfileFields,
} from "../../../common";
import { Button, Card, Copy, Heading, Page } from "../components/ui";
import { useDashboard } from "./Dashboard";
import { Details } from "./Account";
export default function AccountDetails() {
  const { data, member, retry } = useDashboard();
  const family = new Map<
    string,
    {
      name: string;
      relationship: string;
      dob?: string | null;
      gender?: string | null;
      packages: string[];
    }
  >();
  for (const product of data?.products ?? [])
    for (const policy of product.Policies ?? []) {
      const people = [
        ...(policy.Dependents ?? []).map((p) => ({
          name: p.DependentFullName || "Family member",
          relationship: p.DependentRelationship || "Family member",
          dob: p.DependentDateofBirth,
          gender: p.DependentGender,
        })),
        ...(policy.Insurer ?? []).map((p) => ({
          name: p.InsurerName || "Covered member",
          relationship: p.InsurerRelationship || "Covered member",
          dob: p.InsurerDateofBirth,
          gender: p.InsurerGender,
        })),
      ];
      for (const p of people) {
        if (
          p.name.trim().toLowerCase() === member.Name?.trim().toLowerCase() &&
          /^self$/i.test(p.relationship)
        )
          continue;
        const key = `${p.name.toLowerCase()}|${p.relationship}|${p.dob}`;
        const saved = family.get(key) ?? { ...p, packages: [] };
        saved.packages.push(
          `${product.ProductName} · ${expiryStatus(product.ValidTill)} · ${formatHomeDate(product.ValidTill)}`,
        );
        family.set(key, saved);
      }
    }
  return (
    <Page title={UI_TEXT.accountDetails2}>
      <Copy>{UI_TEXT.yourFamilyHealthAccount}</Copy>
      <Heading>{member.Name || UI_TEXT.yourAccount}</Heading>
      <Copy>
        {UI_TEXT.membershipFamilyCoverageAndPackageValidityInOnePlace}
      </Copy>
      {!data && <Copy>{UI_TEXT.loadingAccountDetails}</Copy>}
      {!!data?.errors.length && (
        <Card>
          <Copy>{UI_TEXT.someDetailsCouldNotBeLoaded}</Copy>
          <Copy>{data.errors.join("\n")}</Copy>
          <Button title={UI_TEXT.tryAgain} secondary onPress={retry} />
        </Card>
      )}
      <Card>
        <Heading>{UI_TEXT.accountHolder}</Heading>
        <Details row={member} fields={customerProfileFields} />
        <Copy>
          {UI_TEXT.group}: {data?.groupName || UI_TEXT.notProvided}
        </Copy>
        <Copy>
          {UI_TEXT.kycVerification}:{" "}
          {data?.kyc === undefined
            ? UI_TEXT.unavailable
            : data.kyc
              ? UI_TEXT.verified
              : UI_TEXT.incomplete}
        </Copy>
      </Card>
      <Card>
        <Heading>{UI_TEXT.membership}</Heading>
        <Copy>{data ? cardStatus(data.card) : UI_TEXT.loading}</Copy>
        <Copy>{data?.card?.OHOCardnumber}</Copy>
        <Copy>
          {UI_TEXT.validFrom}: {formatHomeDate(data?.card?.StartDate)}
        </Copy>
        <Copy>
          {UI_TEXT.validUntil}: {formatHomeDate(data?.card?.EndDate)}
        </Copy>
        <Image
          source={require("../../assets/oho-card-front.jpg")}
          resizeMode="contain"
          style={{ width: "100%", height: 190 }}
        />
      </Card>
      <Card>
        <Heading>{UI_TEXT.familyMembers}</Heading>
        <Copy>
          {member.Name} · {UI_TEXT.selfAccountHolder}
        </Copy>
        {[...family.entries()].map(([key, p]) => (
          <Card key={key}>
            <Heading>{p.name}</Heading>
            <Copy>
              {p.relationship} · {p.gender} ·{" "}
              {formatHomeDate(p.dob ?? undefined)}
            </Copy>
            {p.packages.map((label, i) => (
              <Copy key={i}>{label}</Copy>
            ))}
          </Card>
        ))}
        {data && !family.size && (
          <Copy>
            {UI_TEXT.noAdditionalFamilyMembersListedInYourPackageRecords}
          </Copy>
        )}
      </Card>
      <Heading>{UI_TEXT.packagesValidity}</Heading>
      {data?.products?.map((product, i) => (
        <Card key={i}>
          <Heading>{product.ProductName}</Heading>
          <Copy>{expiryStatus(product.ValidTill)}</Copy>
          <Copy>
            {UI_TEXT.issuedOn}: {formatHomeDate(product.IssuedOn)}
          </Copy>
          <Copy>
            {UI_TEXT.validUntil}: {formatHomeDate(product.ValidTill)}
          </Copy>
        </Card>
      ))}
      {data && !data.products?.length && (
        <Copy>{UI_TEXT.noPurchasedPackages}</Copy>
      )}
      <Button
        title={UI_TEXT.explorePackages}
        onPress={() => router.push("/packages")}
      />
    </Page>
  );
}
