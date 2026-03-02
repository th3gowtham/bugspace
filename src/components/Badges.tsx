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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "Active" && "bg-success/15 text-success",
        status === "Paused" && "bg-warning/15 text-warning",
        status === "New"    && "bg-primary/15 text-primary",
        status === "Closed" && "bg-destructive/15 text-destructive",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "Active" && "bg-success",
          status === "Paused" && "bg-warning",
          status === "New"    && "bg-primary",
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
        "inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground",
        className
      )}
    >
      {platform}
    </span>
  );
}
