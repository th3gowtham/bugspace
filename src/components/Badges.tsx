import { cn } from "@/lib/utils";

type PlatformType = "HackerOne" | "Bugcrowd" | "Self-Hosted" | "Intigriti" | "YesWeHack";
type StatusType = "Active" | "Paused" | "New" | "Closed";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-sm cursor-default group",
        status === "Active" && "bg-success/15 text-success hover:bg-success/25 hover:shadow-success/20",
        status === "Paused" && "bg-warning/15 text-warning hover:bg-warning/25 hover:shadow-warning/20",
        status === "New" && "bg-primary/15 text-primary hover:bg-primary/25 hover:shadow-primary/20",
        status === "Closed" && "bg-destructive/15 text-destructive hover:bg-destructive/25 hover:shadow-destructive/20",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full transition-transform duration-300 group-hover:scale-125",
          status === "Active" && "bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse",
          status === "Paused" && "bg-warning",
          status === "New" && "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)] animate-pulse",
          status === "Closed" && "bg-destructive"
        )}
      />
      {status}
    </span>
  );
}

interface PlatformBadgeProps {
  platform: PlatformType;
  className?: string;
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-secondary/80 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-secondary-foreground transition-all duration-300 hover:bg-secondary hover:border-border/80 hover:shadow-sm hover:-translate-y-0.5 cursor-default",
        className
      )}
    >
      {platform}
    </span>
  );
}
