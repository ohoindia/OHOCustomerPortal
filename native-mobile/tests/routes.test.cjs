const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );
}
test("every client route has an explicit native route, including dynamic routes and aliases", () => {
  const source = fs.readFileSync(
    path.resolve(root, "../client/src/App.tsx"),
    "utf8",
  );
  const routes = [...source.matchAll(/path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((route) => route !== "*" && route !== "/");
  for (const route of routes) {
    const file = route.replace(/^\//, "").replace(/:([^/]+)/g, "[$1]") + ".tsx";
    assert.ok(
      fs.existsSync(path.join(root, "src/app", file)) ||
        fs.existsSync(path.join(root, "src/app/(member)", file)),
      `Missing native route: ${route}`,
    );
  }
});
test("all native screen imports resolve and the UI contains no WebView or bundled client", () => {
  for (const file of files(path.join(root, "src")).filter((file) =>
    /\.[jt]sx?$/.test(file),
  )) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /react-native-webview|ReactNativeWebView|generated\/client|from ["']\.\/Client["']/,
      file,
    );
    for (const match of source.matchAll(/from ["'](\.[^"']+)["']/g)) {
      const imported = path.resolve(path.dirname(file), match[1]);
      assert.ok(
        ["", ".ts", ".tsx", "/index.ts", "/index.tsx"].some((ext) =>
          fs.existsSync(imported + ext),
        ),
        `Unresolved import ${match[1]} in ${file}`,
      );
    }
  }
});
test("Android preview is separate and broad media permissions remain blocked", () => {
  const config = require("../app.config.js").expo;
  assert.equal(config.android.package, "com.ohoindia.connect.nativepreview");
  for (const permission of [
    "READ_MEDIA_IMAGES",
    "READ_MEDIA_VIDEO",
    "READ_EXTERNAL_STORAGE",
    "WRITE_EXTERNAL_STORAGE",
  ])
    assert.ok(
      config.android.blockedPermissions.includes(
        `android.permission.${permission}`,
      ),
    );
  const profiles = require("../eas.json").build;
  assert.equal(profiles.preview.android.buildType, "apk");
  assert.equal(profiles.production.android.buildType, "app-bundle");
  assert.equal(profiles.production.env.APP_VARIANT, "production");
});
