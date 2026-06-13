// ─── Netlify Serverless Function: sendEmail ───────────────────────────────────
// POST /.netlify/functions/sendEmail
// Body: {
//   programName: string,
//   description: string,
//   emails: string[],
//   templateType?: "normal" | "premium",  // defaults to "normal"
//   companyName?: string,
//   platformType?: string,
//   bountyRange?: string,
//   status?: string,
//   programUrl?: string,
//   programId?: string,
//   campaignId?: string,
// }
//
// Sends individual email notifications via Resend API with rate-limiting,
// retry logic, and anti-spam best practices for reliable inbox delivery.
//
// Supports two distinct email templates:
//   1. Normal Program  – Professional blue-accent design
//   2. Premium Program – Exclusive gold + dark theme design
// ──────────────────────────────────────────────────────────────────────────────

// ─── Configuration ───────────────────────────────────────────────────────────

const BATCH_SIZE = 10;                  // emails per batch
const DELAY_BETWEEN_EMAILS_MS = 300;    // ~3 emails/second
const DELAY_BETWEEN_BATCHES_MS = 2000;  // pause between batches
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;       // doubles each retry (exponential)
const SITE_URL = "https://bugspace.in";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build a professional, inbox-friendly HTML email for NORMAL program launches.
 * Theme: Clean, minimal, blue accent (#4f46e5).
 */
function buildNormalEmailHtml({ programName, description, companyName, platformType, bountyRange, status, programUrl, programId }) {
  const year = new Date().getFullYear();
  const safeDescription =
    description ||
    "A new program has been added on BugSpace. Check it out and be among the first to explore the scope.";
  const viewUrl = programId ? `${SITE_URL}/programs/${programId}` : (programUrl || SITE_URL);

  // Build detail rows
  const detailRows = [];
  if (companyName) {
    detailRows.push({ label: "Company", value: companyName });
  }
  if (platformType) {
    detailRows.push({ label: "Platform", value: platformType.charAt(0).toUpperCase() + platformType.slice(1) });
  }
  if (bountyRange) {
    detailRows.push({ label: "Bounty Range", value: bountyRange });
  }
  if (status) {
    detailRows.push({ label: "Status", value: status.charAt(0).toUpperCase() + status.slice(1) });
  }

  const detailsHtml = detailRows.length > 0
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
        ${detailRows.map((row, i) => `
          <tr style="${i > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">
            <td style="padding:10px 16px; font-size:13px; font-weight:600; color:#64748b; width:120px; background-color:#f8fafc;">${row.label}</td>
            <td style="padding:10px 16px; font-size:13px; color:#1e293b; background-color:#ffffff;">${row.value}</td>
          </tr>
        `).join("")}
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>New Program on BugSpace</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#f4f4f7; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">

  <!-- Preheader (hidden preview text for inbox) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    ${programName} is now listed on BugSpace. View details and scope inside.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">

          <!-- Logo / Brand -->
          <tr>
            <td style="text-align:center; padding-bottom:24px;">
              <span style="font-size:24px; font-weight:700; color:#4f46e5; letter-spacing:-0.3px;">BugSpace</span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden;">

                <!-- Accent bar -->
                <tr>
                  <td style="height:4px; background: linear-gradient(90deg, #4f46e5, #6366f1);"></td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 32px;">

                    <!-- Greeting -->
                    <p style="margin:0 0 20px 0; font-size:16px; color:#1e293b; line-height:1.5;">
                      Hello,
                    </p>

                    <!-- Notification label -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="background-color:#eef2ff; border:1px solid #c7d2fe; border-radius:16px; padding:5px 12px; font-size:11px; font-weight:600; color:#4f46e5; text-transform:uppercase; letter-spacing:0.4px;">
                          🚀 New Program
                        </td>
                      </tr>
                    </table>

                    <!-- Program name -->
                    <h1 style="margin:0 0 8px 0; font-size:22px; font-weight:700; color:#0f172a; line-height:1.3;">
                      ${programName}
                    </h1>

                    <!-- Description -->
                    <p style="margin:0 0 20px 0; font-size:15px; line-height:1.7; color:#475569;">
                      ${safeDescription}
                    </p>

                    <!-- Program Details Table -->
                    ${detailsHtml}

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                      <tr>
                        <td align="center" style="border-radius:8px; background-color:#4f46e5;">
                          <a href="${viewUrl}" target="_blank" rel="noopener" style="display:inline-block; padding:13px 32px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                            View Program →
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align:center; padding-top:24px;">
              <p style="margin:0 0 6px 0; font-size:12px; color:#64748b; line-height:1.5;">
                You are receiving this email as a
                <strong>Premium member</strong> of
                <a href="${SITE_URL}" style="color:#4f46e5; text-decoration:none;">BugSpace</a>.
              </p>
              <p style="margin:0; font-size:11px; color:#94a3b8;">
                &copy; ${year} BugSpace &middot; bugspace.in
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Build a premium, exclusive-feeling HTML email for PREMIUM program launches.
 * Theme: Dark background (#0f0f0f) with gold accents (#f59e0b, #d97706).
 */
function buildPremiumEmailHtml({ programName, description, companyName, platformType, bountyRange, status, programUrl, programId }) {
  const year = new Date().getFullYear();
  const safeDescription =
    description ||
    "An exclusive premium program has been added to BugSpace. As a Premium member, you get first access.";
  const viewUrl = programId ? `${SITE_URL}/program/${programId}` : (programUrl || SITE_URL);

  // Build detail rows
  const detailRows = [];
  if (companyName) {
    detailRows.push({ label: "Company", value: companyName });
  }
  if (platformType) {
    detailRows.push({ label: "Platform", value: platformType.charAt(0).toUpperCase() + platformType.slice(1) });
  }
  if (bountyRange) {
    detailRows.push({ label: "Bounty Range", value: bountyRange });
  }
  if (status) {
    detailRows.push({ label: "Status", value: status.charAt(0).toUpperCase() + status.slice(1) });
  }

  const detailsHtml = detailRows.length > 0
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; border:1px solid #2a2a2a; border-radius:8px; overflow:hidden;">
        ${detailRows.map((row, i) => `
          <tr style="${i > 0 ? 'border-top:1px solid #2a2a2a;' : ''}">
            <td style="padding:10px 16px; font-size:13px; font-weight:600; color:#a3a3a3; width:120px; background-color:#171717;">${row.label}</td>
            <td style="padding:10px 16px; font-size:13px; color:#e5e5e5; background-color:#1a1a1a;">${row.value}</td>
          </tr>
        `).join("")}
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Premium Program on BugSpace</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">

  <!-- Preheader (hidden preview text for inbox) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    ⭐ Exclusive: ${programName} — Premium-only access on BugSpace
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">

          <!-- Logo / Brand -->
          <tr>
            <td style="text-align:center; padding-bottom:24px;">
              <span style="font-size:24px; font-weight:700; color:#f59e0b; letter-spacing:-0.3px;">⭐ BugSpace</span>
              <span style="font-size:13px; font-weight:600; color:#d97706; letter-spacing:1px; display:block; margin-top:2px;">PREMIUM</span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#141414; border-radius:12px; border:1px solid #2a2a2a; overflow:hidden;">

                <!-- Gold accent bar -->
                <tr>
                  <td style="height:4px; background: linear-gradient(90deg, #d97706, #f59e0b, #fbbf24, #f59e0b, #d97706);"></td>
                </tr>

                <!-- Premium Banner -->
                <tr>
                  <td style="background-color:#1a1a1a; padding:16px 32px; border-bottom:1px solid #2a2a2a;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <span style="font-size:12px; font-weight:700; color:#f59e0b; text-transform:uppercase; letter-spacing:1.5px;">⭐ Premium Exclusive</span>
                        </td>
                        <td align="right">
                          <span style="background-color:#f59e0b20; border:1px solid #f59e0b50; border-radius:12px; padding:3px 10px; font-size:10px; font-weight:600; color:#f59e0b; text-transform:uppercase; letter-spacing:0.4px;">Early Access</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:32px 32px 36px;">

                    <!-- Greeting -->
                    <p style="margin:0 0 16px 0; font-size:15px; color:#a3a3a3; line-height:1.5;">
                      Hello, Premium Member 👋
                    </p>

                    <!-- Exclusive access callout -->
                    <p style="margin:0 0 20px 0; font-size:14px; color:#d4d4d4; line-height:1.6; background-color:#1a1a1a; border-left:3px solid #f59e0b; padding:12px 16px; border-radius:0 6px 6px 0;">
                      As a Premium member, you get <strong style="color:#f59e0b;">exclusive first access</strong> to this new program before anyone else.
                    </p>

                    <!-- Program name -->
                    <h1 style="margin:0 0 8px 0; font-size:24px; font-weight:700; color:#fafafa; line-height:1.3;">
                      ${programName}
                    </h1>

                    <!-- Description -->
                    <p style="margin:0 0 24px 0; font-size:15px; line-height:1.7; color:#a3a3a3;">
                      ${safeDescription}
                    </p>

                    <!-- Program Details Table -->
                    ${detailsHtml}

                    <!-- CTA Button (Gold gradient) -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td align="center" style="border-radius:8px; background: linear-gradient(135deg, #d97706, #f59e0b);">
                          <a href="${viewUrl}" target="_blank" rel="noopener" style="display:inline-block; padding:14px 36px; font-size:14px; font-weight:700; color:#0f0f0f; text-decoration:none; letter-spacing:0.3px;">
                            ⭐ Access Program →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Premium reminder -->
                    <p style="margin:16px 0 0 0; font-size:12px; color:#737373; line-height:1.5; text-align:center;">
                      This program is available exclusively to Premium members.
                    </p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align:center; padding-top:24px;">
              <p style="margin:0 0 6px 0; font-size:12px; color:#737373; line-height:1.5;">
                You are receiving this email as a
                <strong style="color:#f59e0b;">Premium member</strong> of
                <a href="${SITE_URL}" style="color:#f59e0b; text-decoration:none;">BugSpace</a>.
              </p>
              <p style="margin:0; font-size:11px; color:#525252;">
                &copy; ${year} BugSpace Premium &middot; bugspace.in
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Send a single email to one recipient via Resend, with retry + exponential backoff.
 */
async function sendOneEmailWithRetry(apiKey, recipientEmail, subject, htmlContent, entityRefId) {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "BugSpace <noreply@bugspace.in>",
          to: [recipientEmail],
          reply_to: "support@bugspace.in",
          subject,
          html: htmlContent,
          headers: {
            "X-Entity-Ref-ID": entityRefId || `bugspace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Resend API ${response.status}: ${errorBody}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[sendEmail] Attempt ${attempt}/${RETRY_ATTEMPTS} failed for ${recipientEmail}: ${error.message}`
      );
      if (attempt === RETRY_ATTEMPTS) {
        throw error;
      }
      await sleep(delayMs);
    }
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function handler(event) {
  const startTime = Date.now();

  // Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Validate env
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[sendEmail] RESEND_API_KEY is not configured");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Email service not configured" }),
    };
  }

  // Parse & validate body
  let programName, description, emails, templateType, companyName, platformType, bountyRange, status, programUrl, programId, campaignId;
  try {
    const body = JSON.parse(event.body);
    programName = body.programName;
    description = body.description;
    emails = body.emails;
    templateType = body.templateType || "normal";
    companyName = body.companyName || "";
    platformType = body.platformType || "";
    bountyRange = body.bountyRange || "";
    status = body.status || "";
    programUrl = body.programUrl || "";
    programId = body.programId || "";
    campaignId = body.campaignId || "";
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (!programName || typeof programName !== "string") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "programName is required" }),
    };
  }

  if (!Array.isArray(emails) || emails.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "emails array is required and must not be empty",
      }),
    };
  }

  // Validate templateType
  if (templateType !== "normal" && templateType !== "premium") {
    templateType = "normal";
  }

  // Filter & deduplicate valid emails
  const seen = new Set();
  const validEmails = emails.filter((e) => {
    if (typeof e !== "string" || !e.includes("@")) return false;
    const lower = e.toLowerCase().trim();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  if (validEmails.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No valid emails provided" }),
    };
  }

  console.log(
    `[sendEmail] Starting [${templateType}]: "${programName}" → ${validEmails.length} recipient(s)`
  );

  // Build email content based on template type
  const templateData = { programName, description: description || "", companyName, platformType, bountyRange, status, programUrl, programId };
  let subject, htmlContent;

  if (templateType === "premium") {
    subject = `⭐ Premium Program Added - Exclusive Access`;
    htmlContent = buildPremiumEmailHtml(templateData);
  } else {
    subject = `🚀 New Bug Bounty Program Added on BugSpace`;
    htmlContent = buildNormalEmailHtml(templateData);
  }

  // ── Sequential one-by-one sending with batching and rate-limiting ──────

  // Split into batches of BATCH_SIZE
  const batches = [];
  for (let i = 0; i < validEmails.length; i += BATCH_SIZE) {
    batches.push(validEmails.slice(i, i + BATCH_SIZE));
  }

  let totalSent = 0;
  let totalFailed = 0;
  const failedEmails = [];

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    console.log(
      `[sendEmail] Batch ${batchIdx + 1}/${batches.length} (${batch.length} emails)`
    );

    for (let emailIdx = 0; emailIdx < batch.length; emailIdx++) {
      const email = batch[emailIdx];
      // Build a unique entity ref ID using campaignId for deduplication
      const entityRefId = campaignId
        ? `${campaignId}-${email}`
        : `bugspace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      try {
        const result = await sendOneEmailWithRetry(
          apiKey,
          email,
          subject,
          htmlContent,
          entityRefId
        );
        totalSent++;
        console.log(
          `[sendEmail] ✓ Sent to ${email} (id: ${result.id})`
        );
      } catch (error) {
        totalFailed++;
        failedEmails.push({ email, error: error.message });
        console.error(
          `[sendEmail] ✗ Failed ${email}: ${error.message}`
        );
      }

      // Rate-limit: wait between individual emails (except for the last one in the batch)
      if (emailIdx < batch.length - 1) {
        await sleep(DELAY_BETWEEN_EMAILS_MS);
      }
    }

    // Wait longer between batches (except after the last batch)
    if (batchIdx < batches.length - 1) {
      console.log(
        `[sendEmail] Batch ${batchIdx + 1} done. Pausing ${DELAY_BETWEEN_BATCHES_MS}ms before next batch…`
      );
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[sendEmail] Complete [${templateType}]: ${totalSent} sent, ${totalFailed} failed in ${elapsed}s`
  );

  // Response
  if (totalSent === 0 && totalFailed > 0) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "All emails failed to send",
        totalSent,
        totalFailed,
        failedEmails,
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Emails sent",
      totalSent,
      totalFailed,
      batches: batches.length,
      elapsedSeconds: parseFloat(elapsed),
      templateType,
      campaignId: campaignId || undefined,
      failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
    }),
  };
}
