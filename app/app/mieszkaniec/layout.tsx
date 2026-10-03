import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Czy dojadę? — AgloSat",
  description:
    "Sprawdź, co o drodze do przychodni, apteki czy sklepu wiadomo, skąd i od kiedy — i czego nikt jeszcze nie sprawdził.",
};

// Pasek przeglądarki w kolorze nagłówka widoku; po instalacji to kolor paska stanu aplikacji.
export const viewport: Viewport = { themeColor: "#0f172a" };

export default function MieszkaniecLayout({ children }: { children: React.ReactNode }) {
  return children;
}
