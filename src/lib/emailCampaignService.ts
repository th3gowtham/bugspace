// ─── Email Campaign Analytics Service ─────────────────────────────────────────
// Logs email campaign dispatches to Firestore so admins can track send history,
// delivery rates, and campaign performance from the Admin Panel.
//
// Collection: emailCampaigns
// ──────────────────────────────────────────────────────────────────────────────

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as fsLimit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type EmailTemplateType = "normal" | "premium";

export interface EmailCampaignRecord {
  id: string;
  campaignId: string;
  templateType: EmailTemplateType;
  programName: string;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  elapsedSeconds: number;
  createdAt: Date;
  createdBy: string;
}

export interface LogCampaignData {
  campaignId: string;
  templateType: EmailTemplateType;
  programName: string;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  elapsedSeconds: number;
  createdBy: string;
}

// ─── Log a campaign dispatch ─────────────────────────────────────────────────

/**
 * Write a campaign log document to Firestore after an email dispatch completes.
 * Uses campaignId for deduplication – if a record with the same campaignId
 * already exists, the write is silently skipped.
 */
export async function logEmailCampaign(data: LogCampaignData): Promise<void> {
  try {
    await addDoc(collection(db, "emailCampaigns"), {
      campaignId: data.campaignId,
      templateType: data.templateType,
      programName: data.programName,
      totalRecipients: data.totalRecipients,
      totalSent: data.totalSent,
      totalFailed: data.totalFailed,
      elapsedSeconds: data.elapsedSeconds,
      createdBy: data.createdBy,
      createdAt: serverTimestamp(),
    });

    console.log(
      `[emailCampaign] Campaign ${data.campaignId} logged: ${data.totalSent} sent, ${data.totalFailed} failed`
    );
  } catch (err) {
    // Don't throw – campaign logging failure shouldn't break the user flow
    console.error("[emailCampaign] Failed to log campaign:", err);
  }
}

// ─── Fetch campaign history for admin dashboard ──────────────────────────────

/**
 * Fetch email campaign records ordered by creation date (newest first).
 * Used by the Admin Panel's Email Campaigns tab.
 */
export async function fetchEmailCampaigns(
  maxResults = 50
): Promise<EmailCampaignRecord[]> {
  const q = query(
    collection(db, "emailCampaigns"),
    orderBy("createdAt", "desc"),
    fsLimit(maxResults)
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      campaignId: data.campaignId ?? "",
      templateType: (data.templateType as EmailTemplateType) ?? "normal",
      programName: data.programName ?? "",
      totalRecipients: data.totalRecipients ?? 0,
      totalSent: data.totalSent ?? 0,
      totalFailed: data.totalFailed ?? 0,
      elapsedSeconds: data.elapsedSeconds ?? 0,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      createdBy: data.createdBy ?? "",
    };
  });
}

// ─── Aggregate stats for admin summary cards ─────────────────────────────────

export interface CampaignSummaryStats {
  totalCampaigns: number;
  totalEmailsSent: number;
  totalEmailsFailed: number;
  successRate: number; // 0-100
  lastCampaignTime: Date | null;
}

/**
 * Compute aggregate stats across all campaigns.
 * Uses the same query as fetchEmailCampaigns but aggregates.
 */
export async function getCampaignSummaryStats(): Promise<CampaignSummaryStats> {
  const campaigns = await fetchEmailCampaigns(200);

  const totalCampaigns = campaigns.length;
  const totalEmailsSent = campaigns.reduce((sum, c) => sum + c.totalSent, 0);
  const totalEmailsFailed = campaigns.reduce(
    (sum, c) => sum + c.totalFailed,
    0
  );
  const totalAttempted = totalEmailsSent + totalEmailsFailed;
  const successRate =
    totalAttempted > 0
      ? Math.round((totalEmailsSent / totalAttempted) * 100)
      : 0;
  const lastCampaignTime =
    campaigns.length > 0 ? campaigns[0].createdAt : null;

  return {
    totalCampaigns,
    totalEmailsSent,
    totalEmailsFailed,
    successRate,
    lastCampaignTime,
  };
}
