export function mobileAppearancePlugin() {
  return {
    name: "mobile-appearance",
    enforce: "pre",
    transform(source, id) {
      const file = id.replaceAll("\\", "/");
      if (file.endsWith("/src/pages/profile/Profile.tsx")) {
        return {
          code: source.replace(
            "    </AppShell>",
            `      {(window as Window & { ohoAppVersion?: string }).ohoAppVersion && (
        <p className="mobile-profile-version" style={{ textAlign: "center", color: "#64748b", fontSize: 12, padding: "20px 0 8px" }}>
          {translate("App version")} {(window as Window & { ohoAppVersion?: string }).ohoAppVersion}
        </p>
      )}
    </AppShell>`,
          ),
          map: null,
        };
      }
    },
  };
}
