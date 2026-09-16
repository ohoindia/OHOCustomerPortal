type IconProps = {
  size?: number;
  className?: string;
};

function icon(glyph: string) {
  return function Icon({ size = 18, className = "" }: IconProps) {
    return (
      <span
        className={className}
        style={{
          fontSize: size,
          lineHeight: 1,
          display: "inline-grid",
          placeItems: "center",
        }}
      >
        {glyph}
      </span>
    );
  };
}
export const Home = icon("⌂");
export const CalendarDays = icon("▣");
export const WalletCards = icon("▰");
export const Bell = icon("♢");
export const UserRound = icon("○");
export const ArrowLeft = icon("←");
export const Star = icon("★");
export const MapPin = icon("⌖");
export const ChevronRight = icon("›");
export const Heart = icon("♡");
export const Share2 = icon("↗");
export const Settings = icon("⚙");
