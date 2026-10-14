import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Button, Copy, Heading } from "./ui";
export default function BookingQr({
  value,
  booking,
}: {
  value: string;
  booking: string;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const { width } = useWindowDimensions();
  if (!value.trim()) return null;
  const render = (size: number) =>
    /^https?:\/\//i.test(value.trim()) ? (
      <QRCode value={value.trim()} size={size} />
    ) : (
      <Image
        accessibilityLabel={`Hospital check-in QR code for booking ${booking}`}
        source={{
          uri: value.startsWith("data:image/")
            ? value
            : `data:image/png;base64,${value.trim()}`,
        }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Enlarge QR code for booking ${booking}`}
        onPress={() => setOpen(true)}
      >
        {failed ? <Copy>QR code unavailable</Copy> : render(70)}
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0009",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 22,
              padding: 24,
              gap: 16,
              alignItems: "center",
              width: "100%",
              maxWidth: 380,
            }}
          >
            <Heading>Consultation QR code</Heading>
            <Copy>Booking #{booking}</Copy>
            {!failed && render(Math.min(280, width - 96))}
            <Copy>
              Show this code to the hospital to scan with another mobile.
            </Copy>
            <Button title="Close" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}
