import type { MetadataRoute } from "next";

// Aplikacja instalowalna zaczyna się od widoku mieszkańca: to on odpowiada na pytanie „czy dotrę?”.
// Widok planisty zostaje w zasięgu (scope), więc po instalacji nie wypada do przeglądarki.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app/mieszkaniec",
    name: "AgloSat — czy dotrę?",
    short_name: "AgloSat",
    description:
      "Sprawdź, czy dojdziesz pieszo albo dojedziesz wózkiem, i co po drodze nie jest sprawdzone. Dane: OpenStreetMap i kontrole w terenie.",
    lang: "pl",
    dir: "ltr",
    start_url: "/app/mieszkaniec",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    categories: ["navigation", "travel", "utilities"],
    icons: [
      { src: "/ikony/ikona-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/ikony/ikona-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/ikony/ikona-maskowalna-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Czy dotrę?",
        short_name: "Trasa",
        description: "Wybierz skąd i dokąd, zobacz co jest udokumentowane",
        url: "/app/mieszkaniec",
      },
      {
        name: "Widok urzędu",
        short_name: "Planista",
        description: "Ranking miejsc do kontroli i wpisywanie wyników",
        url: "/app/planista",
      },
    ],
  };
}
