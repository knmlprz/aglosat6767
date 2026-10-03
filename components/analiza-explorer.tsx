"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GapRatioRanking } from "@/components/gap-ratio-ranking";
import { CarAccessSection } from "@/components/car-access-section";
import { PrzeplywyTable } from "@/components/przeplywy-table";
import { OsiedlaRanking } from "@/components/osiedla-ranking";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "gap",
    label: "Gap ratio",
    desc: "Ranking miejscowości — stosunek KM do auta.",
  },
  {
    id: "autem",
    label: "Dostępność autem",
    desc: "Czasy do centrum Stalowej Woli z routing API.",
  },
  {
    id: "osiedla",
    label: "Osiedla",
    desc: "Ruch z bramek zsumowany po osiedlach (przypisanie: najbliższy węzeł OSM).",
  },
  {
    id: "przeplywy",
    label: "Przepływy",
    desc: "Przystanki wg szacowanego ruchu bramkowego.",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

type AnalizaExplorerProps = {
  syncUrl?: boolean;
  className?: string;
  id?: string;
};

export function AnalizaExplorer({
  syncUrl = false,
  className,
  id,
}: AnalizaExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") ?? "gap";
  const [localTab, setLocalTab] = useState<TabId>("gap");
  const active: TabId = syncUrl
    ? TABS.some((t) => t.id === urlTab)
      ? (urlTab as TabId)
      : "gap"
    : localTab;
  const meta = TABS.find((t) => t.id === active)!;

  const onTabChange = useCallback(
    (value: string) => {
      if (syncUrl) {
        router.replace(`/app/analiza?tab=${value}`, { scroll: false });
      } else {
        setLocalTab(value as TabId);
      }
    },
    [router, syncUrl]
  );

  return (
    <section id={id} className={cn("flex flex-col gap-4", className)}>
      <Tabs value={active} onValueChange={onTabChange}>
        <TabsList className="w-full sm:w-auto flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="text-sm text-slate-500">{meta.desc}</p>

      {active === "gap" && <GapRatioRanking embedded />}
      {active === "autem" && <CarAccessSection embedded />}
      {active === "osiedla" && <OsiedlaRanking embedded />}
      {active === "przeplywy" && <PrzeplywyTable embedded />}
    </section>
  );
}

export function AnalizaView() {
  return <AnalizaExplorer syncUrl className="px-4 lg:px-6" />;
}
