"use client";

import { AppShell } from "@/components/app-shell";
import { EtykietowanieView } from "@/components/aglosat/etykietowanie-view";

export default function EtykietyPage() {
  return (
    <AppShell title="AgloSat — Próbka dla modelu">
      <EtykietowanieView />
    </AppShell>
  );
}
