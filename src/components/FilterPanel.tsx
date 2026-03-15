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
const statuses = ["All", "Active", "Paused", "New"];

export function FilterPanel({
  className,
  selectedPlatform = "All",
  onPlatformChange,
  selectedStatus = "All",
  onStatusChange,
}: FilterPanelProps) {
  return (
    <aside className={cn("w-64 shrink-0 space-y-8", className)}>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </h3>
      </div>

      <FilterSection title="Platform">
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => onPlatformChange?.(p)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                selectedPlatform === p
                  ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Status">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange?.(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                selectedStatus === s
                  ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterSection>
    </aside>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
      <div>{children}</div>
    </div>
  );
}
