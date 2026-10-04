// Service worker AgloSat. Po instalacji aplikacja odpowiada na pytanie „czy dotrę?” bez sieci:
// dane pilota to jeden statyczny plik, a trasy liczą się w przeglądarce.
// Offline zostaje bez zmian tylko to, czego nie mamy u siebie: podkład mapy spoza już obejrzanych kafelków.

const WERSJA = "v2"; // v2: dane pilota najpierw z sieci; podbicie usuwa stare kopie pilot.json
const POWLOKA = `aglosat-powloka-${WERSJA}`; // dokumenty i zasoby Next.js
const DANE = `aglosat-dane-${WERSJA}`; // pilot.json
const KAFELKI = `aglosat-kafelki-${WERSJA}`; // podkład mapy (Esri)
const NASZE = [POWLOKA, DANE, KAFELKI];

const START = "/app/mieszkaniec";
const PILOT = "/aglosat/pilot.json";
const HOST_KAFELKOW = "server.arcgisonline.com";
const LIMIT_KAFELKOW = 300;

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const powloka = await caches.open(POWLOKA);
      // Pojedyncze braki nie mogą przerwać instalacji, dlatego nie addAll.
      await Promise.all(
        [START, "/ikony/ikona-192.png", "/ikony/ikona-512.png"].map((u) => powloka.add(u).catch(() => {})),
      );
      const dane = await caches.open(DANE);
      await dane.add(PILOT).catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const stare = (await caches.keys()).filter((k) => k.startsWith("aglosat-") && !NASZE.includes(k));
      await Promise.all(stare.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Ładunek RSC ma ten sam adres co dokument HTML; wspólny wpis w cache dałby stronie treść nie tego rodzaju.
  if (url.searchParams.has("_rsc") || req.headers.get("RSC")) return;

  if (url.hostname === HOST_KAFELKOW) return e.respondWith(kafelek(req));
  if (url.origin !== self.location.origin) return;
  if (url.pathname === PILOT) return e.respondWith(daneNajpierwSiec(req));
  if (req.mode === "navigate") return e.respondWith(dokument(req));
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/ikony/")) {
    return e.respondWith(najpierwCache(req));
  }
  e.respondWith(najpierwSiec(req));
});

/** Zasoby z odciskiem treści w nazwie: nie zmieniają się, więc sieć jest potrzebna tylko raz. */
async function najpierwCache(req) {
  const c = await caches.open(POWLOKA);
  const zapisane = await c.match(req);
  if (zapisane) return zapisane;
  const odp = await fetch(req);
  if (odp.ok) await c.put(req, odp.clone()).catch(() => {});
  return odp;
}

/**
 * Dane pilota: najpierw sieć, żeby po wdrożeniu nowych danych aplikacja od razu pokazywała te same liczby
 * co strona główna; bez sieci ostatnia zapisana kopia.
 */
async function daneNajpierwSiec(req) {
  const c = await caches.open(DANE);
  try {
    const odp = await fetch(req);
    if (odp.ok) await c.put(req, odp.clone()).catch(() => {});
    return odp;
  } catch {
    return (await c.match(req)) ?? Response.error();
  }
}

/** Nawigacja: świeża strona, gdy jest sieć; bez sieci ta sama albo widok mieszkańca. */
async function dokument(req) {
  const c = await caches.open(POWLOKA);
  try {
    const odp = await fetch(req);
    if (odp.ok) await c.put(req, odp.clone()).catch(() => {});
    return odp;
  } catch {
    return (await c.match(req)) ?? (await c.match(START)) ?? Response.error();
  }
}

async function najpierwSiec(req) {
  try {
    return await fetch(req);
  } catch {
    return (await caches.match(req)) ?? Response.error();
  }
}

/** Obejrzany kawałek mapy zostaje na później. Kafelki idą po CORS, więc nie zajmują limitu jak odpowiedzi nieprzejrzyste. */
async function kafelek(req) {
  const c = await caches.open(KAFELKI);
  const zapisany = await c.match(req);
  if (zapisany) return zapisany;
  try {
    const odp = await fetch(req);
    if (odp.ok) {
      await c.put(req, odp.clone()).catch(() => {});
      await przytnij(c, LIMIT_KAFELKOW);
    }
    return odp;
  } catch {
    // Bez podkładu mapa zostaje pusta, a opis trasy i lista miejsc działają dalej.
    return Response.error();
  }
}

async function przytnij(c, limit) {
  const klucze = await c.keys();
  // Cache Storage zwraca klucze w kolejności zapisu, więc najstarsze są na początku.
  for (const k of klucze.slice(0, Math.max(0, klucze.length - limit))) await c.delete(k);
}
