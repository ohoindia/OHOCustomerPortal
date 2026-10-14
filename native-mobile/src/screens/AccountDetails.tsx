import { useCallback, useEffect, useState } from "react";
import { Image, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  customerProfileFields,
  formatHomeDate,
  cardStatus,
} from "../../../common";
import { Button, Card, Copy, Heading, Page, Status } from "../components/ui";
import { Details } from "./Account";
import { loadHomeData } from "../lib/api";
import { getSession } from "../lib/session";
export default function AccountDetails() {
  const member = getSession()!.member;
  const [data, setData] = useState<Awaited<
    ReturnType<typeof loadHomeData>
  > | null>(null);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setAttempt((n) => n + 1);
    }, []),
  );
  useEffect(() => {
    const controller = new AbortController();
    void loadHomeData(
      member.MemberId,
      Number(member.CommunityCustomerId || member.communityCustomerId || 0),
      Number(member.GroupId || 0),
      controller.signal,
      undefined,
      member,
    ).then((result) => {
      if (!controller.signal.aborted) setData(result);
    });
    return () => controller.abort();
  }, [member, attempt]);
  return (
    <Page title="Account details">
      <Card>
        <Copy>Your family health account</Copy>
        <Heading>{data?.customer?.Name || member.Name}</Heading>
        <Copy>
          Membership, family coverage and package validity in one place.
        </Copy>
      </Card>
      <Status loading={!data} error="" retry={() => setAttempt((n) => n + 1)} />
      {!!data?.errors.length && (
        <Card>
          {data.errors.map((error) => (
            <Copy key={error}>{error}</Copy>
          ))}
          <Button
            title="Try again"
            onPress={() => {
              setData(null);
              setAttempt((n) => n + 1);
            }}
          />
        </Card>
      )}
      <Card>
        <Heading>Account holder</Heading>
        <Details
          row={data?.customer ?? member}
          fields={customerProfileFields}
        />
      </Card>
      {data?.card && (
        <Card>
          <Heading>OHO membership card</Heading>
          <Image
            source={require("../../assets/oho-card-front.jpg")}
            resizeMode="contain"
            style={{ width: "100%", height: 190 }}
          />
          <Heading>{data.card.OHOCardnumber}</Heading>
          <Copy>
            {cardStatus(data.card)} · {formatHomeDate(data.card.StartDate)} –{" "}
            {formatHomeDate(data.card.EndDate)}
          </Copy>
          <Image
            source={require("../../assets/oho-card-back.png")}
            resizeMode="contain"
            style={{ width: "100%", height: 160 }}
          />
        </Card>
      )}
      <Heading>Package validity & family coverage</Heading>
      {data?.products?.map((product, i) => (
        <Card key={i}>
          <Heading>{product.ProductName}</Heading>
          <Copy>
            {formatHomeDate(product.IssuedOn)} –{" "}
            {formatHomeDate(product.ValidTill)}
          </Copy>
          <Copy>{product.ShortDescription}</Copy>
          {product.Policies?.map((policy, p) => (
            <View key={p} style={{ gap: 8 }}>
              <Copy>
                {policy.PoliciesProductName} · COI {policy.PolicyCOINumber}
              </Copy>
              {policy.Dependents?.map((person, n) => (
                <Copy key={n}>
                  {person.DependentFullName} · {person.DependentRelationship} ·{" "}
                  {formatHomeDate(person.DependentDateofBirth ?? undefined)}
                </Copy>
              ))}
              {policy.Insurer?.map((person, n) => (
                <Copy key={n}>
                  {person.InsurerName} · {person.InsurerRelationship}
                </Copy>
              ))}
            </View>
          ))}
        </Card>
      ))}
      <Button
        title="View family members"
        onPress={() => router.push("/family")}
      />
      <Button
        title="Explore packages"
        secondary
        onPress={() => router.push("/packages")}
      />
    </Page>
  );
}
