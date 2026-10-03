import { build } from "../../client/node_modules/vite/dist/node/index.js";
import react from "../../client/node_modules/@vitejs/plugin-react/dist/index.js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const client = fileURLToPath(new URL("../../client/", import.meta.url));
const generated = fileURLToPath(new URL("../src/generated/", import.meta.url));
const images = {};
for (const name of [
  "oho-brand.png",
  "oho-card-front.jpg",
  "oho-card-back.png",
]) {
  const bytes = await readFile(path.join(client, "public", name));
  images[name] =
    `data:image/${name.endsWith("jpg") ? "jpeg" : "png"};base64,${bytes.toString("base64")}`;
}
const result = await build({
  configFile: false,
  root: client,
  base: "/",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [
    react(),
    {
      name: "bundle-public-images",
      enforce: "pre",
      transform(source, id) {
        if (!id.includes("/src/") || !/\.[jt]sx?$/.test(id)) return;
        let code = source;
        for (const [name, data] of Object.entries(images)) {
          code = code.replaceAll(
            `\`\${import.meta.env.BASE_URL}${name}\``,
            JSON.stringify(data),
          );
          code = code.replaceAll(`"/${name}"`, JSON.stringify(data));
        }
        return code === source ? undefined : { code, map: null };
      },
    },
  ],
  build: {
    write: false,
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    lib: {
      entry: path.join(client, "src/mobile.tsx"),
      formats: ["iife"],
      name: "OhoClient",
    },
  },
});
const outputs = Array.isArray(result)
  ? result.flatMap((item) => item.output)
  : result.output;
const script = outputs
  .filter((item) => item.type === "chunk")
  .map((item) => item.code)
  .join("\n");
const styles = outputs
  .filter((item) => item.type === "asset" && item.fileName.endsWith(".css"))
  .map((item) => String(item.source))
  .join("\n");
// A single self-contained document prevents missing JS chunks and local asset paths.
const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>OHOINDIA CUSTOMER APP</title><style>${styles.replaceAll("</style", "<\\/style")}</style></head><body><div id="root"></div><!--OHO_BOOTSTRAP--><script>${script.replaceAll("</script", "<\\/script")}</script></body></html>`;
await mkdir(generated, { recursive: true });
await writeFile(path.join(generated, "client.json"), JSON.stringify({ html }));
console.log(`Bundled shared client (${Math.round(html.length / 1024)} KB).`);
