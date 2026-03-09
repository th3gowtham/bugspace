import { X, Megaphone } from "lucide-react";
import { useState } from "react";
import type { Announcement } from "@/lib/announcementService";
import { markAnnouncementSeen } from "@/lib/announcementService";
import { toast } from "sonner";

interface AnnouncementModalProps {
  announcement: Announcement;
  uid: string;
  onDismiss: () => void;
}

export function AnnouncementModal({
  announcement,
  uid,
  onDismiss,
}: AnnouncementModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleDismiss = async () => {
    setSubmitting(true);
    try {
      await markAnnouncementSeen(uid, announcement.id);
    } catch {
      toast.error("Failed to save seen status.");
    } finally {
      setSubmitting(false);
      onDismiss();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Announcement
              </p>
              <h2 className="text-base font-semibold text-foreground leading-snug">
                {announcement.title}
              </h2>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            disabled={submitting}
            className="mt-0.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {announcement.message}
          </p>
          <p className="mt-3 text-xs text-muted-foreground/60">
            {announcement.createdAt.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={handleDismiss}
            disabled={submitting}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
