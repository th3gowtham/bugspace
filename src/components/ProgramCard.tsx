import { Bookmark, ExternalLink, Lock, ArrowRight } from "lucide-react";
import { StatusBadge, PlatformBadge } from "./Badges";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export interface ProgramData {
  id: string;
  name: string;
  company: string;
  platform: "HackerOne" | "Bugcrowd" | "Self-Hosted" | "Intigriti" | "YesWeHack";
  bountyRange: string;
  status: "Active" | "Paused" | "New" | "Closed";
  updatedDaysAgo: number;
  scopePreview: string;
  industry?: string;
  isPremium?: boolean;
}

interface ProgramCardProps {
  program: ProgramData;
  className?: string;
  isBookmarked?: boolean;
  onBookmark?: (programId: string) => void;
  isUserPremium?: boolean;
  onLockedClick?: (programId: string) => void;
}

export function ProgramCard({
  program,
  className,
  isBookmarked = false,
  onBookmark,
  isUserPremium = false,
  onLockedClick,
}: ProgramCardProps) {
  const locked = !!program.isPremium && !isUserPremium;

  const displayName = locked ? "Premium Program" : program.name;
  const displayCompany = locked ? "Confidential" : program.company;

  return (
    <div
      className={cn(
        "group relative glass-card p-6 flex flex-col justify-between transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 border border-border/50 hover:border-primary/40 overflow-hidden",
        className
      )}
    >
      {/* Decorative gradient blob on hover */}
      <div className="absolute -inset-x-0 -top-20 -z-10 h-32 bg-gradient-to-b from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:from-primary/10" />

      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={program.status} />
              {program.isPremium && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20 shadow-sm">
                  <Lock className="h-3 w-3" />
                  Premium
                </span>
              )}
            </div>
            {locked ? (
              <h3 className="text-xl font-bold tracking-tight text-foreground/70 truncate select-none mt-1">
                {displayName}
              </h3>
            ) : (
              <Link to={`/program/${program.id}`} className="inline-block mt-1">
                <h3 className="text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors truncate">
                  {displayName}
                </h3>
              </Link>
            )}
            <p className="text-sm font-medium text-muted-foreground mt-1">{displayCompany}</p>
          </div>
          <button
            onClick={() => onBookmark?.(program.id)}
            disabled={locked}
            className={cn(
              "shrink-0 p-2.5 rounded-full transition-all duration-300 active:scale-90 z-10",
              locked
                ? "text-muted-foreground/30 cursor-not-allowed bg-muted/20"
                : isBookmarked
                  ? "text-primary bg-primary/10 hover:bg-primary/20 hover:shadow-md hover:shadow-primary/5"
                  : "text-muted-foreground hover:text-primary hover:bg-secondary hover:shadow-sm"
            )}
          >
            <Bookmark className={cn("h-4 w-4 transition-all duration-500", isBookmarked && !locked ? "fill-primary scale-125" : "scale-100 hover:scale-110")} />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4">
          {locked ? (
            <span className="inline-block rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground/50 select-none blur-[2px]">
              Platform Name
            </span>
          ) : (
            <PlatformBadge platform={program.platform} />
          )}
          <span className="text-xs font-medium text-muted-foreground/80 flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40 inline-block" />
            {locked ? "Updated recently" : (program.updatedDaysAgo === 0 ? "Updated today" : `Updated ${program.updatedDaysAgo}d ago`)}
          </span>
        </div>

        <p className={cn(
          "text-sm text-muted-foreground/90 mt-4 line-clamp-2 leading-relaxed",
          locked && "blur-[4px] select-none opacity-60"
        )}>
          {locked ? "This is a premium feature. Subscribe to view program details, comprehensive scope, and high-value bounty targets hidden from the public." : program.scopePreview}
        </p>
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Bounty</span>
          <span className="text-sm font-bold text-success drop-shadow-sm">{locked ? "Premium Target" : program.bountyRange}</span>
        </div>

        {locked ? (
          <button
            onClick={() => onLockedClick?.(program.id)}
            className="group/btn inline-flex items-center gap-2 text-sm font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 rounded-xl transition-all duration-300 border border-amber-500/20 hover:border-amber-500/40 hover:shadow-md hover:shadow-amber-500/10 active:scale-95"
          >
            <Lock className="h-4 w-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:scale-110" />
            Unlock Access
          </button>
        ) : (
          <Link
            to={`/program/${program.id}`}
            className="group/btn inline-flex items-center gap-2 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2.5 rounded-xl transition-all duration-300 border border-primary/20 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 active:scale-95"
          >
            View Details
            <ArrowRight className="h-4 w-4 transition-all duration-300 group-hover/btn:translate-x-1.5 group-hover/btn:scale-110" />
          </Link>
        )}
      </div>
    </div>
  );
}
