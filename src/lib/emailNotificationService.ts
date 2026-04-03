// ─── Email Notification Service ───────────────────────────────────────────────
// Frontend helper to fetch notifiable users from Firestore and trigger the
// Netlify sendEmail function after a new program is created.
// ──────────────────────────────────────────────────────────────────────────────

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Fetch all users from Firestore where `notify !== false`.
 * If the `notify` field is missing, the user is treated as opted-in.
 * Returns an array of email strings.
 */
export async function fetchNotifiableEmails(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, "users"));
  const emails: string[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    // Only include users with valid email and notify !== false
    if (data.email && typeof data.email === "string" && data.notify !== false) {
      emails.push(data.email);
    }
  });

  return emails;
}

/**
 * Call the Netlify sendEmail function to notify users about a new program.
 *
 * @param programName  Name of the newly created program
 * @param description  Brief description of the program (shown in email body)
 * @param emails       Array of recipient email addresses
 *
 * @returns The JSON response from the Netlify function
 */
export async function sendProgramNotification(
  programName: string,
  description: string,
  emails: string[]
): Promise<{
  message: string;
  totalSent: number;
  totalFailed: number;
  batches: number;
  elapsedSeconds?: number;
  failedEmails?: Array<{ email: string; error: string }>;
}> {
  if (emails.length === 0) {
    return { message: "No emails to send", totalSent: 0, totalFailed: 0, batches: 0 };
  }

  const response = await fetch("/.netlify/functions/sendEmail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      programName,
      description,
      emails,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to send email notifications");
  }

  return data;
}

/**
 * All-in-one: fetch notifiable users and send them a program notification.
 * Call this after successfully creating a new program.
 *
 * @param programName  Name of the newly created program
 * @param description  Brief description or bounty range for the email body
 */
export async function notifyUsersAboutNewProgram(
  programName: string,
  description: string
): Promise<void> {
  try {
    const emails = await fetchNotifiableEmails();

    if (emails.length === 0) {
      console.log("No users to notify.");
      return;
    }

    console.log(`Sending notifications to ${emails.length} user(s)…`);
    const result = await sendProgramNotification(programName, description, emails);
    console.log(
      `Notification result: ${result.totalSent} sent, ${result.totalFailed} failed`
    );
  } catch (error) {
    // Log but don't throw – email failure shouldn't block program creation
    console.error("Email notification failed:", error);
  }
}
