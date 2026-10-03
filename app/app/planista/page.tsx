"use client";

import { AppShell } from "@/components/app-shell";
import { PlanistaView } from "@/components/aglosat/planista-view";

export default function PlanistaPage() {
  return (
    <AppShell title="AgloSat — Planista">
      <PlanistaView />
    </AppShell>
  );
}
