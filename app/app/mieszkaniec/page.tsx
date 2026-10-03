"use client";

import { AppShell } from "@/components/app-shell";
import { MieszkaniecView } from "@/components/aglosat/mieszkaniec-view";

export default function MieszkaniecPage() {
  return (
    <AppShell title="AgloSat — Mieszkaniec">
      <MieszkaniecView />
    </AppShell>
  );
}
