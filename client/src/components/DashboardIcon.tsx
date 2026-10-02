type IconName =
  | "brand"
  | "search"
  | "bell"
  | "doctor"
  | "qr"
  | "pharmacy"
  | "records"
  | "home"
  | "calendar"
  | "profile";
const paths: Record<IconName, React.ReactNode> = {
  brand: (
    <g stroke="none">
      <circle cx="12" cy="12" r="12" fill="#0095bd" />
      <g fill="none" stroke="#fff" strokeWidth="1.25">
        <ellipse cx="6.8" cy="11.45" rx="1.85" ry="2.05" />
        <ellipse cx="17.2" cy="11.45" rx="1.85" ry="2.05" />
      </g>
      <circle cx="12" cy="6.55" r="1.1" fill="#fff" />
      <g fill="none" stroke="#fff" strokeWidth="1.75" strokeLinecap="round">
        <path d="M7.3 4.6C10.4 6.8 11.1 11.4 10.65 16.6M16.8 4.8C12.8 7.8 12.4 13.8 14.2 19.35" />
        <path d="M10.6 11.4h2.9" />
      </g>
    </g>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="m16 16 5 5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M10 21h4" />
    </>
  ),
  doctor: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M8 11v3l4 4 4-4v-3M4 22v-5c0-3 3-4 4-4m8 0c1 0 4 1 4 4v5ZM8 16v3m8-3v3" />
      <circle cx="8" cy="20" r="1" />
      <circle cx="16" cy="20" r="1" />
    </>
  ),
  qr: (
    <>
      <path d="M3 3h6v6H3ZM15 3h6v6h-6ZM3 15h6v6H3ZM12 3v3m0 3v4H3m3-1v2m6 2v6m3-10h6m-6 3v3h3v3h3v-5m-3-1v-3" />
      <path d="M5 5h2v2H5ZM17 5h2v2h-2ZM5 17h2v2H5Z" fill="currentColor" />
    </>
  ),
  pharmacy: (
    <>
      <path d="m4 13 8-8a4.2 4.2 0 0 1 6 6l-8 8a4.2 4.2 0 0 1-6-6ZM8 9l6 6" />
      <circle cx="18" cy="18" r="5" fill="var(--icon-background, #e3f4fa)" />
      <path d="m15 21 6-6" />
    </>
  ),
  records: (
    <>
      <path d="M14 2H5v20h14V7ZM14 2v5h5M8 11h8M8 15h8M8 19h4" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-8 9 8v11h-6v-7H9v7H3Z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="17" rx="2" />
      <path d="M7 2v6m10-6v6M3 11h18" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="6" r="4" />
      <path d="M3 22v-3a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v3" />
    </>
  ),
};
export function DashboardIcon({ name }: { name: IconName }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
