import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const origin = "https://neocalc.test";
async function harness({
  failure = false,
  redirect = false,
  loginPage = false,
} = {}) {
  const code = await readFile("public/sw.js", "utf8"),
    listeners = {},
    stores = new Map(),
    fetches = [];
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (k) => stores.delete(k),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const data = stores.get(name);
      return {
        put: async (k, v) =>
          data.set(typeof k === "string" ? k : new URL(k.url).pathname, v),
        match: async (k) => data.get(k),
      };
    },
  };
  const response = (path) => ({
    ok: true,
    redirected: redirect,
    type: "basic",
    url: origin + path,
    body: "shell-simulado",
    text: async () =>
      loginPage
        ? "Página de login sem shell"
        : '<html data-neocalc-shell="v1">shell-simulado</html>',
    clone() {
      return { ...this };
    },
  });
  const self = {
    location: { origin },
    clients: { claim: async () => {} },
    addEventListener: (k, fn) => (listeners[k] = fn),
  };
  const context = {
    self,
    caches,
    Request,
    Response,
    URL,
    Set,
    fetch: async (request) => {
      fetches.push(request);
      if (failure) throw Error("Offline simulado");
      return response(new URL(request.url).pathname);
    },
  };
  vm.runInNewContext(code, context);
  return {
    listeners,
    caches,
    stores,
    fetches,
    response,
    setFailure: (v) =>
      (context.fetch = async (request) => {
        fetches.push(request);
        if (v) throw Error("Offline simulado");
        return response(new URL(request.url).pathname);
      }),
  };
}
async function install(h) {
  let task;
  h.listeners.install({ waitUntil: (p) => (task = p) });
  await task;
}
async function fetchEvent(h, path, { mode = "navigate", method = "GET" } = {}) {
  const tasks = [];
  let result;
  h.listeners.fetch({
    request: { url: origin + path, mode, method },
    respondWith: (p) => (result = p),
    waitUntil: (p) => tasks.push(p),
  });
  const response = await result;
  await Promise.all(tasks);
  return response;
}
test("service worker pré-carrega shell e retorna cópia em falha de rede simulada", async () => {
  const h = await harness();
  await install(h);
  h.setFailure(true);
  assert.equal((await fetchEvent(h, "/")).body, "shell-simulado");
  assert.equal((await fetchEvent(h, "/index.html")).body, "shell-simulado");
});
test("service worker não intercepta APIs, autenticação, backups, queries ou POST", async () => {
  const h = await harness();
  for (const path of [
    "/api/pacientes",
    "/auth/login",
    "/backup.json",
    "/?token=simulado",
    "/entregas/codigo.zip",
  ])
    assert.equal(await fetchEvent(h, path), undefined);
  assert.equal(await fetchEvent(h, "/", { method: "POST" }), undefined);
  assert.equal(h.fetches.length, 0);
});
test("precache falha em redirecionamento e ativação preserva caches de outros apps", async () => {
  const h = await harness({ redirect: true });
  await assert.rejects(() => install(h), /redirecionado/);
  const good = await harness();
  await install(good);
  await good.caches.open("outro-app-cache");
  await good.caches.open("neocalc-antigo");
  let task;
  good.listeners.activate({ waitUntil: (p) => (task = p) });
  await task;
  assert.ok(good.stores.has("outro-app-cache"));
  assert.ok(!good.stores.has("neocalc-antigo"));
  assert.equal(good.stores.has("neocalc-shell-v1"), true);
});
test("manifest e build contêm recursos esperados, sem alegar instalação em navegador", async () => {
  const manifest = JSON.parse(
    await readFile("dist/manifest.webmanifest", "utf8"),
  );
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  for (const size of ["192x192", "512x512"]) {
    const icon = manifest.icons.find((i) => i.sizes === size);
    assert.ok(icon);
    const content = await readFile("dist" + icon.src);
    assert.equal(content.subarray(1, 4).toString(), "PNG");
  }
  const sw = await readFile("dist/sw.js", "utf8"),
    assets = JSON.parse(sw.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]);
  assert.ok(assets.some((p) => p.endsWith(".js")));
  assert.ok(assets.some((p) => p.endsWith(".css")));
  assert.ok(assets.some((p) => p.endsWith(".woff2")));
  for (const path of assets.filter((p) => p !== "/"))
    await readFile("dist" + path);
  assert.ok(!sw.includes("neocalc-shell-v1"));
});

test("HTML de login com status 200 não é aceito como shell no precache", async () => {
  const h = await harness({ loginPage: true });
  await assert.rejects(() => install(h), /Precache/);
  assert.equal(h.stores.size, 0);
});
