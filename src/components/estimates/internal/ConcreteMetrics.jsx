/**
 * ConcreteMetrics — Inline internal display for concrete-type line items.
 *
 * Shows derived volume calculations (ft³, yd³, bag count) below the service
 * name inside the estimate editor. Internal-only — never rendered in
 * customer-facing documents or PDFs.
 *
 * Props:
 *   item — normalized line item object
 */
import { deriveConcreteMetrics } from '@/lib/concreteCalculator';

export default function ConcreteMetrics({ item }) {
  const metrics = deriveConcreteMetrics(item);
  if (!metrics) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
      {/* Volume badge */}
      <span className="inline-flex items-center gap-1 text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full border bg-sky-50 border-sky-200 text-sky-700">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
        {metrics.cubic_yards} yd³
      </span>

      {/* Cubic feet */}
      <span className="text-[9px] text-slate-400">
        {metrics.cubic_feet} ft³
      </span>

      {/* Thickness */}
      <span className="text-[9px] text-slate-400">
        {metrics.thickness_inches}" thick
      </span>

      {/* Bag count */}
      <span className="text-[9px] text-slate-400">
        ~{metrics.bag_count_80lb} bags (80lb)
      </span>

      {/* Waste */}
      {metrics.waste_percent > 0 && (
        <span className="text-[9px] text-amber-500">
          +{metrics.waste_percent}% waste
        </span>
      )}
    </div>
  );
}