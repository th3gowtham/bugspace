// ─── Netlify Serverless Function: sendEmail ───────────────────────────────────
// POST /.netlify/functions/sendEmail
// Body: { programName: string, description: string, emails: string[] }
//
// Sends individual email notifications via Resend API with rate-limiting,
// retry logic, and anti-spam best practices for reliable inbox delivery.
// ──────────────────────────────────────────────────────────────────────────────

// ─── Configuration ───────────────────────────────────────────────────────────

const BATCH_SIZE = 10;                  // emails per batch
const DELAY_BETWEEN_EMAILS_MS = 300;    // ~3 emails/second
const DELAY_BETWEEN_BATCHES_MS = 2000;  // pause between batches
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;       // doubles each retry (exponential)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build a clean, inbox-friendly HTML email.
 * Avoids spam trigger words, uses proper structure, includes text-based
 * greeting, clear purpose, and a footer explaining WHY the user received it.
 */
function buildEmailHtml(programName, description) {
  const year = new Date().getFullYear();
  const safeDescription =
    description ||
    "A new program has been added on BugSpace. Check it out and be among the first to explore the scope.";

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
                  <td style="height:4px; background-color:#4f46e5;"></td>
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
                          New Program
                        </td>
                      </tr>
                    </table>

                    <!-- Program name -->
                    <h1 style="margin:0 0 12px 0; font-size:22px; font-weight:700; color:#0f172a; line-height:1.3;">
                      ${programName}
                    </h1>

                    <!-- Description -->
                    <p style="margin:0 0 24px 0; font-size:15px; line-height:1.7; color:#475569;">
                      ${safeDescription}
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="border-radius:8px; background-color:#4f46e5;">
                          <a href="https://bugspace.in" target="_blank" rel="noopener" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                            View on BugSpace
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
                You are receiving this email because you registered on
                <a href="https://bugspace.in" style="color:#4f46e5; text-decoration:none;">BugSpace</a>.
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
 * Send a single email to one recipient via Resend, with retry + exponential backoff.
 */
async function sendOneEmailWithRetry(apiKey, recipientEmail, subject, htmlContent) {
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
            "X-Entity-Ref-ID": `bugspace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
  let programName, description, emails;
  try {
    const body = JSON.parse(event.body);
    programName = body.programName;
    description = body.description;
    emails = body.emails;
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
    `[sendEmail] Starting: "${programName}" → ${validEmails.length} recipient(s)`
  );

  // Build email content
  const subject = `New Program on BugSpace: ${programName}`;
  const htmlContent = buildEmailHtml(programName, description || "");

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
      try {
        const result = await sendOneEmailWithRetry(
          apiKey,
          email,
          subject,
          htmlContent
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
    `[sendEmail] Complete: ${totalSent} sent, ${totalFailed} failed in ${elapsed}s`
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
      failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
    }),
  };
}
