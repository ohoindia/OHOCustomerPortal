const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const exported = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../src/lib/booking-qr.ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  { exports: exported },
);
const { bookingQrSource } = exported;

test("booking PNG data is displayed as an image instead of re-encoded", () => {
  const png = "iVBORw0KGgo" + "A".repeat(10000);
  const source = bookingQrSource(` ${png} `);
  assert.equal(source.kind, "image");
  assert.equal(source.value, `data:image/png;base64,${png}`);
});
test("existing image data URIs are preserved", () => {
  const uri = "data:image/png;base64,iVBORw0KGgo=";
  assert.equal(bookingQrSource(uri).value, uri);
  assert.equal(bookingQrSource(uri).kind, "image");
});
test("hospital URLs are encoded into scannable QR codes", () => {
  const url = "https://hospital.example/check-in?id=123";
  assert.equal(bookingQrSource(` ${url} `).kind, "url");
  assert.equal(bookingQrSource(url).value, url);
});
test("empty QR values are omitted", () => {
  assert.equal(bookingQrSource("  "), null);
});
