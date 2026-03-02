import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  className?: string;
  selectedPlatform?: string;
  onPlatformChange?: (v: string) => void;
  selectedStatus?: string;
  onStatusChange?: (v: string) => void;
}

const platforms = ["All", "HackerOne", "Bugcrowd", "Self-Hosted", "Intigriti", "YesWeHack"];
const statuses  = ["All", "Active", "Paused", "New"];

export function FilterPanel({
  className,
  selectedPlatform = "All",
  onPlatformChange,
  selectedStatus = "All",
  onStatusChange,
}: FilterPanelProps) {
  return (
    <aside className={cn("w-64 shrink-0 space-y-6", className)}>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </h3>
      </div>

      <FilterSection title="Platform">
        {platforms.map((p) => (
          <label key={p} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <input
              type="radio"
              name="platform"
              checked={selectedPlatform === p}
              onChange={() => onPlatformChange?.(p)}
              className="accent-primary"
            />
            {p}
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Status">
        {statuses.map((s) => (
          <label key={s} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <input
              type="radio"
              name="status"
              checked={selectedStatus === s}
              onChange={() => onStatusChange?.(s)}
              className="accent-primary"
            />
            {s}
          </label>
        ))}
      </FilterSection>
    </aside>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
