import path from "node:path";
import fs from "node:fs/promises";
import { processCSS, css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import esbuild from "esbuild";

await fs.writeFile("global.css", processCSS(css``));

await fs.writeFile(
  "index.mjs",
  javascript`
    import "@fontsource/jetbrains-mono/variable.css";
    import "@fontsource/jetbrains-mono/variable-italic.css";

    import "tippy.js/dist/tippy.css";
    import "tippy.js/dist/svg-arrow.css";
    import "tippy.js/dist/border.css";
    import "@leafac/css/build/browser.css";
    import "./global.css";

    import tippy, * as tippyStatic from "tippy.js";
    window.tippy = tippy;
    window.tippy.hideAll = tippyStatic.hideAll;

    // TODO
    // import * as leafac from "@leafac/javascript/build/leafac--javascript.mjs";
    // window.leafac = leafac;
  `
);

const esbuildResult = await esbuild.build({
  entryPoints: ["index.mjs"],
  outdir: "../build/static/",
  entryNames: "[dir]/[name]--[hash]",
  assetNames: "[dir]/[name]--[hash]",

  loader: { ".woff2": "file" },

  target: ["chrome100", "safari14", "edge100", "firefox100", "ios14"],

  bundle: true,
  minify: true,
  sourcemap: true,
  metafile: true,
});

await fs.unlink("global.css");
await fs.unlink("index.mjs");

const paths = {};

for (const [javascriptBundle, { entryPoint, cssBundle }] of Object.entries(
  esbuildResult.metafile.outputs
))
  if (entryPoint === "index.mjs" && typeof cssBundle === "string") {
    paths["index.css"] = cssBundle.slice("../build/static/".length);
    paths["index.mjs"] = javascriptBundle.slice("../build/static/".length);
    break;
  }

await fs.writeFile(
  new URL("../build/static/paths.json", import.meta.url),
  JSON.stringify(paths, undefined, 2)
);

for (const source of ["favicon.ico"]) {
  const destination = path.join("../build/static", source);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}
