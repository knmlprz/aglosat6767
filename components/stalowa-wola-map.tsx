"use client";

import { useState } from "react";
import { MapView } from "@/components/map/map-view";
import { LocalityPanel } from "@/components/map/locality-panel";

export function StalowaWolaMap() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  return (
    <div className="relative">
      <MapView
        mode="localities"
        selectedSlug={selectedSlug}
        onSelectLocality={setSelectedSlug}
      />
      <LocalityPanel
        selectedSlug={selectedSlug}
        onClose={() => setSelectedSlug(null)}
      />
    </div>
  );
}
