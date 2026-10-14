const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const restrictedPermissions = [
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];

for (const variant of ["production", "preview"]) {
  test(`${variant} Android manifest removes broad media and storage permissions`, () => {
    // Introspection runs the actual config plugins without creating native directories.
    const config = JSON.parse(execFileSync(process.execPath, [
      require.resolve("expo/bin/cli"), "config", "--type", "introspect", "--json",
    ], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, APP_VARIANT: variant, EXPO_NO_TELEMETRY: "1" },
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    }));
    assert.equal(config.android.package, variant === "preview"
      ? "com.ohoindia.connect.preview" : "com.ohoindia.connect");
    const manifest = config._internal.modResults.android.manifest.manifest;
    const permissions = manifest["uses-permission"] || [];
    for (const permission of restrictedPermissions) {
      const entries = permissions.filter((entry) => entry.$["android:name"] === permission);
      assert.ok(entries.length > 0, `Missing manifest removal for ${permission}`);
      for (const entry of entries) {
        assert.equal(entry.$["tools:node"], "remove", `${permission} must not be granted`);
      }
    }
  });
}
