"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { FullDashboard } from "@/components/dashboard/full-dashboard";

export default function DashboardPage() {
  return (
    <AppShell title="AgloSat — Panel">
      <Suspense>
        <FullDashboard />
      </Suspense>
    </AppShell>
  );
}
