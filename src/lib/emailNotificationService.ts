// ─── Email Notification Service ───────────────────────────────────────────────
// Frontend helper to fetch Premium-only users from Firestore and trigger the
// Netlify sendEmail function after a new program is created.
//
// Only users with an active, non-expired Premium subscription receive emails.
// This pulls from TWO sources:
//   1. `premiumUsers/{uid}`   – admin-granted or paid Premium
//   2. `users` collection     – referral-earned Premium (premiumSource == "referral")
//
// Supports two email template types:
//   - "normal"  → for regular (public) program launches
//   - "premium" → for premium-exclusive program launches
// ──────────────────────────────────────────────────────────────────────────────

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { logEmailCampaign, type EmailTemplateType } from "./emailCampaignService";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProgramNotificationData {
  programName: string;
  description: string;
  isPremium: boolean;
  companyName?: string;
  platformType?: string;
  bountyRange?: string;
  status?: string;
  programUrl?: string;
  programId?: string;
}

// ─── Generate unique campaign ID ─────────────────────────────────────────────

function generateCampaignId(): string {
  return `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Fetch emails of all users who currently hold an active (non-expired) Premium
 * subscription from either the premiumUsers collection or referral-awarded
 * Premium stored in the users collection.
 *
 * Returns a deduplicated array of email strings.
 *
 * Logs detailed per-document diagnostics so you can trace exactly why each user
 * was included or excluded.
 */
export async function fetchNotifiableEmails(): Promise<string[]> {
  const now = new Date();
  const emailSet = new Set<string>();

  console.log("[emailNotification] ── Fetching Premium recipients ──");
  console.log(`[emailNotification] Current time: ${now.toISOString()}`);

  // ── Source 1: premiumUsers collection (admin-granted + paid) ─────────────
  try {
    const premiumSnap = await getDocs(collection(db, "premiumUsers"));
    console.log(
      `[emailNotification] premiumUsers collection: ${premiumSnap.size} document(s)`
    );

    let includedFromPremium = 0;
    let excludedInactive = 0;
    let excludedExpired = 0;
    let excludedNoEmail = 0;

    premiumSnap.forEach((doc) => {
      const data = doc.data();
      const docEmail = data.email ?? "(missing)";

      if (!data.isActive) {
        excludedInactive++;
        console.log(
          `[emailNotification]   SKIP premiumUsers/${doc.id}: isActive=false, email=${docEmail}`
        );
        return;
      }

      const endDate: Date = data.endDate?.toDate?.() ?? new Date(0);
      if (endDate < now) {
        excludedExpired++;
        console.log(
          `[emailNotification]   SKIP premiumUsers/${doc.id}: expired endDate=${endDate.toISOString()}, email=${docEmail}`
        );
        return;
      }

      if (!data.email || typeof data.email !== "string") {
        excludedNoEmail++;
        console.log(
          `[emailNotification]   SKIP premiumUsers/${doc.id}: no valid email field`
        );
        return;
      }

      includedFromPremium++;
      console.log(
        `[emailNotification]   INCLUDE premiumUsers/${doc.id}: email=${data.email}, isActive=true, endDate=${endDate.toISOString()}`
      );
      emailSet.add(data.email.toLowerCase().trim());
    });

    console.log(
      `[emailNotification] premiumUsers summary: ${includedFromPremium} included, ${excludedInactive} inactive, ${excludedExpired} expired, ${excludedNoEmail} missing-email`
    );
  } catch (err) {
    console.warn("[emailNotification] Failed to read premiumUsers collection:", err);
  }

  // ── Source 2: users with referral-earned Premium ─────────────────────────
  try {
    const referralSnap = await getDocs(
      query(collection(db, "users"), where("premiumSource", "==", "referral"))
    );
    console.log(
      `[emailNotification] Referral premium users: ${referralSnap.size} document(s)`
    );

    let includedFromReferral = 0;
    let excludedExpired = 0;
    let excludedNoEmail = 0;

    referralSnap.forEach((doc) => {
      const data = doc.data();
      const docEmail = data.email ?? "(missing)";

      const premiumUntil: Date = data.premiumUntil?.toDate?.() ?? new Date(0);
      if (premiumUntil < now) {
        excludedExpired++;
        console.log(
          `[emailNotification]   SKIP users/${doc.id}: referral expired premiumUntil=${premiumUntil.toISOString()}, email=${docEmail}`
        );
        return;
      }

      if (!data.email || typeof data.email !== "string") {
        excludedNoEmail++;
        console.log(
          `[emailNotification]   SKIP users/${doc.id}: no valid email field (referral)`
        );
        return;
      }

      includedFromReferral++;
      console.log(
        `[emailNotification]   INCLUDE users/${doc.id} (referral): email=${data.email}, premiumUntil=${premiumUntil.toISOString()}`
      );
      emailSet.add(data.email.toLowerCase().trim());
    });

    console.log(
      `[emailNotification] Referral summary: ${includedFromReferral} included, ${excludedExpired} expired, ${excludedNoEmail} missing-email`
    );
  } catch (err) {
    console.warn("[emailNotification] Failed to read referral premium users:", err);
  }

  const emails = Array.from(emailSet);
  console.log(
    `[emailNotification] FINAL: ${emails.length} eligible Premium recipient(s) after dedup`
  );
  if (emails.length > 0) {
    console.log(`[emailNotification] Recipients: ${emails.join(", ")}`);
  }
  return emails;
}

/**
 * Call the Netlify sendEmail function with rich program data and template type.
 *
 * @returns The JSON response from the Netlify function
 */
export async function sendProgramNotification(
  data: ProgramNotificationData,
  emails: string[],
  campaignId: string
): Promise<{
  message: string;
  totalSent: number;
  totalFailed: number;
  batches: number;
  elapsedSeconds?: number;
  templateType?: string;
  campaignId?: string;
  failedEmails?: Array<{ email: string; error: string }>;
}> {
  if (emails.length === 0) {
    return { message: "No emails to send", totalSent: 0, totalFailed: 0, batches: 0 };
  }

  const templateType: EmailTemplateType = data.isPremium ? "premium" : "normal";

  const response = await fetch("/.netlify/functions/sendEmail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      programName:  data.programName,
      description:  data.description,
      emails,
      templateType,
      companyName:  data.companyName  || "",
      platformType: data.platformType || "",
      bountyRange:  data.bountyRange  || "",
      status:       data.status       || "",
      programUrl:   data.programUrl   || "",
      programId:    data.programId    || "",
      campaignId,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to send email notifications");
  }

  return result;
}

/**
 * All-in-one: fetch notifiable premium users and send them a program notification.
 * Call this after successfully creating a new program.
 *
 * @param data  Rich program data including isPremium flag
 * @param createdBy  UID of the employer who created the program (for campaign logging)
 */
export async function notifyUsersAboutNewProgram(
  data: ProgramNotificationData,
  createdBy: string
): Promise<void> {
  const campaignId = generateCampaignId();
  const templateType: EmailTemplateType = data.isPremium ? "premium" : "normal";

  try {
    const emails = await fetchNotifiableEmails();

    if (emails.length === 0) {
      console.log("[emailNotification] No premium users to notify.");
      return;
    }

    console.log(
      `[emailNotification] Sending ${templateType} notifications to ${emails.length} premium user(s)…`
    );
    const result = await sendProgramNotification(data, emails, campaignId);
    console.log(
      `[emailNotification] Result: ${result.totalSent} sent, ${result.totalFailed} failed`
    );

    // Log campaign to Firestore for admin analytics
    await logEmailCampaign({
      campaignId,
      templateType,
      programName: data.programName,
      totalRecipients: emails.length,
      totalSent: result.totalSent,
      totalFailed: result.totalFailed,
      elapsedSeconds: result.elapsedSeconds ?? 0,
      createdBy,
    });
  } catch (error) {
    // Log but don't throw – email failure shouldn't block program creation
    console.error("[emailNotification] Email notification failed:", error);
  }
}
