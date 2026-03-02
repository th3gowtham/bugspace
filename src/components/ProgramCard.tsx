import { Bookmark, ExternalLink, Lock } from "lucide-react";
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
        "group glass-card p-5 transition-all duration-200 hover:border-primary/30 hover:glow-primary",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {locked ? (
              <span className="text-base font-semibold text-foreground/60 truncate select-none">
                {displayName}
              </span>
            ) : (
              <Link to={`/program/${program.id}`} className="text-base font-semibold text-foreground hover:text-primary transition-colors truncate">
                {displayName}
              </Link>
            )}
            <StatusBadge status={program.status} />
            {program.isPremium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
                <Lock className="h-2.5 w-2.5" />
                Premium
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{displayCompany}</p>
        </div>
        <button
          onClick={() => onBookmark?.(program.id)}
          disabled={locked}
          className={`shrink-0 p-1.5 rounded-md transition-colors ${
            locked
              ? "text-muted-foreground/40 cursor-not-allowed"
              : isBookmarked
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-primary hover:bg-secondary"
          }`}
        >
          <Bookmark className={`h-4 w-4 ${isBookmarked && !locked ? "fill-primary" : ""}`} />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3">
        {locked ? (
          <span className="inline-block rounded-full bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground/50 select-none blur-[2px]">
            Platform
          </span>
        ) : (
          <PlatformBadge platform={program.platform} />
        )}
        <span className="text-xs text-muted-foreground">
          {locked ? "Updated recently" : (program.updatedDaysAgo === 0 ? "Updated today" : `Updated ${program.updatedDaysAgo}d ago`)}
        </span>
      </div>

      <p className={`text-sm text-muted-foreground mt-3 line-clamp-2 ${locked ? "blur-sm select-none" : ""}`}>
        {locked ? "Subscribe to view program details and scope." : program.scopePreview}
      </p>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <span className="text-sm font-medium text-success">{locked ? "Premium" : program.bountyRange}</span>
        {locked ? (
          <button
            onClick={() => onLockedClick?.(program.id)}
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-500 hover:underline"
          >
            <Lock className="h-3 w-3" />
            Unlock Access
          </button>
        ) : (
          <Link
            to={`/program/${program.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View Details
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
