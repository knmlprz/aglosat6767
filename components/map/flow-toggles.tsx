"use client";

import type { FlowTimeSlot } from "@/lib/osiedla-flows";
import { FLOW_COLOR_LEGEND, FLOW_SLOT_LABELS } from "@/lib/osiedla-flows";
import { Switch } from "@/components/ui/switch";

const SLOTS: FlowTimeSlot[] = ["morning", "afternoon", "all"];

type Props = {
  slot: FlowTimeSlot;
  onSlotChange: (s: FlowTimeSlot) => void;
  showFlows: boolean;
  onShowFlowsChange: (v: boolean) => void;
};

export function FlowToggles({
  slot,
  onSlotChange,
  showFlows,
  onShowFlowsChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">
        Przepływy — pora dnia
      </div>
      <div className="flex flex-wrap gap-2">
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSlotChange(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              slot === s
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {FLOW_SLOT_LABELS[s]}
          </button>
        ))}
      </div>
      <label className="flex items-center justify-between gap-3 cursor-pointer text-sm border-t border-slate-100 pt-2">
        <span className="text-slate-700">Pokaż połączenia osiedle → osiedle</span>
        <Switch checked={showFlows} onCheckedChange={onShowFlowsChange} />
      </label>
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span className="shrink-0">Natężenie:</span>
        <div className="flex flex-1 items-center gap-0.5">
          {FLOW_COLOR_LEGEND.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <span
                className="h-2 w-full rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              {item.label ? (
                <span className="text-[10px] text-slate-400">{item.label}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-snug">
        Każde osiedle połączone z każdym. Liczby to szczyt / dzień wg danych
        bramkowych z przystanków — kolor i grubość = udział w ruchu.
      </p>
    </div>
  );
}
