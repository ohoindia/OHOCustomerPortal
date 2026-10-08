import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import BookingQr from "../components/BookingQr";
import { appointmentFields, bookingPeriods, UI_TEXT } from "../../../common";
import { bookingPeriod } from "../../../common/utils/bookings";
import {
  consultationSavings,
  savingsCurrency,
} from "../../../common/utils/savings";
import { translate } from "../../../common/content/locale";
import { Button, Card, Copy, Heading, Page, Status } from "../components/ui";
import { getSession } from "../lib/session";
import { useData, value, type Row } from "../lib/data";
import { Details } from "./Account";
export default function Bookings() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const [period, setPeriod] = useState<string>(UI_TEXT.all);
  const data = useData<Row[]>(
    "api/BookingConsultation/PendingAndSuccessConsultationList",
    { customerId: getSession()!.member.MemberId },
  );
  const rows = data.data?.filter((row) =>
    bookingId
      ? value(row, "BookingConsultationId") === bookingId
      : period === UI_TEXT.all || translate(bookingPeriod(row)) === period,
  );
  return (
    <Page title={bookingId ? UI_TEXT.bookingDetails : UI_TEXT.myBookings}>
      {!bookingId && (
        <Card>
          <Copy>{UI_TEXT.yourCareInOnePlace}</Copy>
          <Heading>
            {UI_TEXT.everyVisit}
            {"\n"}
            {UI_TEXT.alwaysWithinReach}
          </Heading>
          <Copy>{UI_TEXT.keepTrackOfYourCareAndYourFamilyS}</Copy>
          <Button
            title={UI_TEXT.findAHospital}
            secondary
            onPress={() => router.push("/network")}
          />
        </Card>
      )}
      <Status {...data} />
      {!bookingId && (
        <>
          {bookingPeriods.map((tab) => (
            <Button
              key={tab}
              title={`${tab} (${data.data?.filter((row) => tab === UI_TEXT.all || translate(bookingPeriod(row)) === tab).length ?? 0})`}
              secondary={tab !== period}
              onPress={() => setPeriod(tab)}
            />
          ))}
          <Card>
            <Copy>Savings from these bookings, including family visits</Copy>
            <Heading>
              {savingsCurrency(consultationSavings(rows ?? []).total)}
            </Heading>
          </Card>
        </>
      )}
      {rows?.map((row) => {
        const id = value(row, "BookingConsultationId");
        const qr = value(row, "QRCode").trim() || value(row, "QRCodeUrl").trim();
        return (
          <Card key={id}>
            <Copy>
              {value(row, "ServiceName") ||
                value(row, "PoliciesType") ||
                UI_TEXT.hospitalConsultation}
            </Copy>
            <Heading>{value(row, "HospitalName")}</Heading>
            <Copy>
              {value(row, "AppointmentDate")} · {value(row, "Name")}
            </Copy>
            <Copy>
              #{id} · {value(row, "StatusName")}
            </Copy>
            <BookingQr value={qr} />
            {!bookingId ? (
              <Button
                title={UI_TEXT.viewDetails3}
                secondary
                onPress={() =>
                  router.push({
                    pathname: "/hospitalConsulationForm",
                    params: { bookingId: id },
                  })
                }
              />
            ) : (
              <Details row={row} fields={appointmentFields} />
            )}
          </Card>
        );
      })}
      {!data.loading && !data.error && !rows?.length && (
        <Card>
          <Heading>
            {bookingId
              ? UI_TEXT.noBookingsFound
              : UI_TEXT.aLittleRoomForYourNextVisit}
          </Heading>
          <Copy>
            {bookingId
              ? UI_TEXT.thisConsultationWasNotFoundInYourAccount
              : UI_TEXT.noBookingsFound}
          </Copy>
          <Button
            title={UI_TEXT.exploreHospitals}
            onPress={() => router.push("/network")}
          />
        </Card>
      )}
    </Page>
  );
}
