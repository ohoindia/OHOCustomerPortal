export function clearSession() {
  sessionStorage.clear();
  localStorage.clear();

  // Cookies must be expired with the path and domain used when setting them.
  const paths = new Set(["/"]);
  const segments = window.location.pathname.split("/").filter(Boolean);
  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    paths.add(path);
    paths.add(`${path}/`);
  }

  const domains = [""];
  const labels = window.location.hostname.split(".");
  for (let index = 0; index < labels.length; index++) {
    const domain = labels.slice(index).join(".");
    domains.push(`; Domain=${domain}`, `; Domain=.${domain}`);
  }

  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!name) continue;
    for (const cookiePath of paths) {
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${cookiePath}${domain}`;
      }
    }
  }
}
