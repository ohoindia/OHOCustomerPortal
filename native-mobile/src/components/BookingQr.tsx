import { Component, type PropsWithChildren } from "react";
import { Image, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { bookingQrSource } from "../lib/booking-qr";
import { Copy } from "./ui";

class QrFallback extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Copy>Unable to display this booking QR code.</Copy>
    ) : this.props.children;
  }
}

export default function BookingQr({ value }: { value: string }) {
  const source = bookingQrSource(value);
  if (!source) return null;
  return (
    <View style={{ alignItems: "center", padding: 12 }}>
      <QrFallback key={source.value}>
        {source.kind === "url" ? (
          <QRCode value={source.value} size={128} quietZone={8} />
        ) : (
          <BookingQrImage key={source.value} uri={source.value} />
        )}
      </QrFallback>
    </View>
  );
}

class BookingQrImage extends Component<{ uri: string }, { failed: boolean }> {
  state = { failed: false };
  render() {
    return this.state.failed ? (
      <Copy>Unable to display this booking QR code.</Copy>
    ) : (
      <Image
        source={{ uri: this.props.uri }}
        style={{ width: 128, height: 128 }}
        accessibilityLabel="Booking QR code"
        resizeMode="contain"
        onError={() => this.setState({ failed: true })}
      />
    );
  }
}
