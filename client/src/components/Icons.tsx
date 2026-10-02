import { UI_TEXT } from "../../../common/content/labels";
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
export const Home = icon(UI_TEXT.homeIcon);
export const CalendarDays = icon(UI_TEXT.gridIcon);
export const WalletCards = icon(UI_TEXT.walletIcon);
export const Bell = icon(UI_TEXT.diamondIcon);
export const UserRound = icon(UI_TEXT.circleIcon);
export const ArrowLeft = icon(UI_TEXT.backArrow);
export const Star = icon(UI_TEXT.starIcon);
export const MapPin = icon(UI_TEXT.locationIcon);
export const ChevronRight = icon(UI_TEXT.chevronRight);
export const Heart = icon(UI_TEXT.heartIcon);
export const Share2 = icon(UI_TEXT.externalLinkIcon);
export const Settings = icon(UI_TEXT.settingsIcon);
