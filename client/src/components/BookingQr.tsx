import {
  formatMessage,
  translate as localize,
} from "../../../common/content/locale";
import { useRef } from "react";
import QRCode from "react-qr-code";
import "./booking-qr.css";

export function BookingQr({
  value,
  booking,
}: {
  value?: string | null;
  booking: string | number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const qrImage = value?.trim();
  if (!qrImage) return null;
  // The booking API supplies the hospital QR as a PNG, as in Customer Portal.
  // Encoding IdHashCode again loses the hospital URL contained in that image.
  const qrSource = qrImage.startsWith("data:image/png;base64,")
    ? qrImage
    : `data:image/png;base64,${qrImage}`;
  const isBookingUrl = /^https?:\/\//i.test(qrImage);
  const renderQr = (size: number) =>
    isBookingUrl ? (
      <QRCode
        value={qrImage}
        size={size}
        title={formatMessage("Hospital check-in QR code for booking {0}", [
          booking,
        ])}
      />
    ) : (
      <img
        src={qrSource}
        width={size}
        height={size}
        alt={formatMessage("Hospital check-in QR code for booking {0}", [
          booking,
        ])}
      />
    );
  return (
    <>
      <button
        type="button"
        className="appointment-qr-code appointment-qr-thumbnail"
        aria-label={formatMessage("Enlarge QR code for booking {0}", [booking])}
        aria-haspopup="dialog"
        title={localize("Tap to enlarge QR code")}
        onClick={() => dialog.current?.showModal()}
      >
        {renderQr(48)}
      </button>
      <dialog
        ref={dialog}
        className="appointment-qr-dialog"
        aria-label={formatMessage("Consultation QR code for booking {0}", [
          booking,
        ])}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="appointment-qr-popup">
          <h3>{localize("Consultation QR code")}</h3>
          <p>
            {localize("Booking #")}
            {booking}
          </p>
          <div className="appointment-qr-code">{renderQr(320)}</div>
          <p>
            {localize(
              "Show this code to the hospital to scan with another mobile.",
            )}
          </p>
          <button
            type="button"
            className="outline-btn"
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            {localize("Close")}
          </button>
        </div>
      </dialog>
    </>
  );
}
