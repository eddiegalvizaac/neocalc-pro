/* Build replaces these constants with an exact allowlist and a content-derived version. */
const CACHE = "neocalc-shell-v1";
const PRECACHE = ["/", "/index.html", "/icon.svg", "/manifest.webmanifest"];
const allowed = new Set(PRECACHE);
async function acceptable(response, path) {
  if (
    !response.ok ||
    response.redirected ||
    response.type === "opaque" ||
    new URL(response.url || self.location.origin).origin !==
      self.location.origin
  )
    return false;
  if (path === "/" || path === "/index.html")
    return (await response.clone().text()).includes('data-neocalc-shell="v1"');
  return true;
}
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const responses = await Promise.all(
        PRECACHE.map((path) =>
          fetch(
            new Request(new URL(path, self.location.origin), {
              redirect: "error",
              cache: "reload",
              credentials: "same-origin",
            }),
          ),
        ),
      );
      const valid = await Promise.all(
        responses.map((response, index) =>
          acceptable(response, PRECACHE[index]),
        ),
      );
      if (valid.some((value) => !value))
        throw Error("Precache incompleto ou redirecionado.");
      const cache = await caches.open(CACHE);
      await Promise.all(
        PRECACHE.map((path, index) => cache.put(path, responses[index])),
      );
    })(),
  );
  // Do not force activation while older application tabs are open.
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("neocalc-") && k !== CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  // Never cache APIs, exported backups, authentication routes, or arbitrary queries.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.search ||
    !allowed.has(url.pathname)
  )
    return;
  const network = async (cache) => {
    const response = await fetch(request);
    if (await acceptable(response, url.pathname))
      event.waitUntil(cache.put(url.pathname, response.clone()));
    return response;
  };
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (request.mode === "navigate") {
        try {
          return await network(cache);
        } catch {
          return (
            (await cache.match(url.pathname)) ||
            (await cache.match("/index.html")) ||
            Response.error()
          );
        }
      }
      return (await cache.match(url.pathname)) || network(cache);
    })(),
  );
});
