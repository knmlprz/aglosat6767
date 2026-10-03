export type DestinationData = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  color: string;
  emoji: string;
};

export const DESTINATIONS: DestinationData[] = [
  {
    id: "hsw",
    name: "Huta Stalowa Wola (HSW)",
    lat: 50.5516,
    lon: 22.0734,
    type: "Praca",
    color: "#f59e0b",
    emoji: "🏭",
  },
  {
    id: "szpital",
    name: "Szpital Powiatowy",
    lat: 50.5699,
    lon: 22.0628,
    type: "Zdrowie",
    color: "#ef4444",
    emoji: "🏥",
  },
  {
    id: "urzad",
    name: "Urząd Miasta Stalowa Wola",
    lat: 50.5828,
    lon: 22.0519,
    type: "Urząd",
    color: "#8b5cf6",
    emoji: "🏛",
  },
  {
    id: "kul",
    name: "KUL / Politechnika Rzeszowska",
    lat: 50.5804,
    lon: 22.0601,
    type: "Edukacja",
    color: "#10b981",
    emoji: "🎓",
  },
  {
    id: "dworzec",
    name: "Dworzec PKP Rozwadów",
    lat: 50.5578,
    lon: 22.0992,
    type: "Transport",
    color: "#1d4ed8",
    emoji: "🚉",
  },
  {
    id: "szkola-lo",
    name: "LO im. M. Konopnickiej",
    lat: 50.5765,
    lon: 22.058,
    type: "Edukacja",
    color: "#059669",
    emoji: "📚",
  },
];

export function getDestinationName(id: string): string {
  return DESTINATIONS.find((d) => d.id === id)?.name ?? id;
}
