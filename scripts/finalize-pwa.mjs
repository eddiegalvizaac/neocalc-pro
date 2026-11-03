import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const files = (await readdir("dist/assets")).sort();
const precache = [
  "/",
  "/index.html",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
  ...files.map((f) => "/assets/" + f),
];
const hash = createHash("sha256");
for (const p of precache.filter((p) => p !== "/")) {
  hash.update(p);
  hash.update(await readFile("dist" + p));
}
const source = await readFile("public/sw.js", "utf8");
hash.update(source);
const cache = "neocalc-" + hash.digest("hex").slice(0, 16);
const sw = source
  .replace(/const CACHE = .*?;/, `const CACHE = ${JSON.stringify(cache)};`)
  .replace(
    /const PRECACHE = \[[\s\S]*?\];/,
    `const PRECACHE = ${JSON.stringify(precache)};`,
  );
await writeFile("dist/sw.js", sw);
