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
  const qrValue = value?.trim();
  if (!qrValue) return null;
  return (
    <>
      <button
        type="button"
        className="appointment-qr-code appointment-qr-thumbnail"
        aria-label={`Enlarge QR code for booking ${booking}`}
        aria-haspopup="dialog"
        title="Tap to enlarge QR code"
        onClick={() => dialog.current?.showModal()}
      >
        <QRCode
          value={qrValue}
          size={48}
          level="M"
          title={`Hospital check-in QR code for booking ${booking}`}
        />
      </button>
      <dialog
        ref={dialog}
        className="appointment-qr-dialog"
        aria-label={`Consultation QR code for booking ${booking}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="appointment-qr-popup">
          <h3>Consultation QR code</h3>
          <p>Booking #{booking}</p>
          <div className="appointment-qr-code">
            <QRCode
              value={qrValue}
              size={320}
              level="M"
              title={`Scan booking ${booking} at the hospital`}
            />
          </div>
          <p>Show this code to the hospital to scan with another mobile.</p>
          <button
            type="button"
            className="outline-btn"
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
