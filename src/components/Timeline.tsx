import { cn } from "@/lib/utils";

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  type: "launch" | "scope" | "bounty" | "status";
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {events.map((event, i) => (
        <div key={i} className="relative pl-6 pb-6 last:pb-0">
          {i < events.length - 1 && (
            <div className="absolute left-[9px] top-4 bottom-0 w-px bg-border" />
          )}
          <div
            className={cn(
              "absolute left-0 top-1 h-[18px] w-[18px] rounded-full border-2 bg-background",
              event.type === "launch" && "border-primary",
              event.type === "scope" && "border-accent",
              event.type === "bounty" && "border-success",
              event.type === "status" && "border-warning"
            )}
          >
            <div
              className={cn(
                "absolute inset-[3px] rounded-full",
                event.type === "launch" && "bg-primary",
                event.type === "scope" && "bg-accent",
                event.type === "bounty" && "bg-success",
                event.type === "status" && "bg-warning"
              )}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{event.date}</p>
            <p className="text-sm font-medium text-foreground">{event.title}</p>
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
