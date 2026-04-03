// ─── Netlify Serverless Function: sendEmail ───────────────────────────────────
// POST /.netlify/functions/sendEmail
// Body: { programName: string, description: string, emails: string[] }
// Sends styled email notifications via Resend API to all provided emails.
// ──────────────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build a modern, responsive HTML email template.
 */
function buildEmailHtml(programName, description) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Program: ${programName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="text-align:center;padding-bottom:32px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:28px;font-weight:800;letter-spacing:-0.5px;">
                BugSpace
              </div>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#13131f 0%,#1a1a2e 100%);border-radius:16px;border:1px solid rgba(99,102,241,0.15);overflow:hidden;">
                
                <!-- Gradient accent bar -->
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7,#d946ef);"></td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:40px 36px;">
                    
                    <!-- Badge -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                      <tr>
                        <td style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;color:#818cf8;text-transform:uppercase;letter-spacing:0.5px;">
                          🚀 New Program Alert
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:700;color:#f1f5f9;line-height:1.3;">
                      ${programName}
                    </h1>

                    <!-- Description -->
                    <p style="margin:0 0 28px 0;font-size:15px;line-height:1.7;color:#94a3b8;">
                      ${description || 'A new bug bounty program has just been listed on BugSpace. Be among the first researchers to explore the scope and start hunting!'}
                    </p>

                    <!-- Divider -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent);"></td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
                          <a href="https://bugspace.in" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
                            View on BugSpace →
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
            <td style="text-align:center;padding-top:32px;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#475569;">
                You're receiving this because you're a registered BugSpace researcher.
              </p>
              <p style="margin:0;font-size:12px;color:#334155;">
                © ${new Date().getFullYear()} BugSpace · <a href="https://bugspace.in" style="color:#6366f1;text-decoration:none;">bugspace.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Send a single batch of emails via Resend with retry logic.
 */
async function sendBatchWithRetry(apiKey, emailBatch, subject, htmlContent) {
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
          to: emailBatch,
          subject,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Resend API ${response.status}: ${errorBody}`);
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Batch attempt ${attempt}/${RETRY_ATTEMPTS} failed:`,
        error.message
      );
      if (attempt === RETRY_ATTEMPTS) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS * attempt); // exponential-ish backoff
    }
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function handler(event) {
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
    console.error("RESEND_API_KEY is not configured");
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
      body: JSON.stringify({ error: "emails array is required and must not be empty" }),
    };
  }

  // Filter to valid email strings
  const validEmails = emails.filter(
    (e) => typeof e === "string" && e.includes("@")
  );

  if (validEmails.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No valid emails provided" }),
    };
  }

  // Build email content
  const subject = `🚀 New Program: ${programName}`;
  const htmlContent = buildEmailHtml(programName, description || "");

  // Split into batches and send sequentially
  const batches = [];
  for (let i = 0; i < validEmails.length; i += BATCH_SIZE) {
    batches.push(validEmails.slice(i, i + BATCH_SIZE));
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < batches.length; i++) {
    try {
      const result = await sendBatchWithRetry(
        apiKey,
        batches[i],
        subject,
        htmlContent
      );
      results.push({
        batch: i + 1,
        count: batches[i].length,
        success: true,
        id: result.id,
      });
    } catch (error) {
      errors.push({
        batch: i + 1,
        count: batches[i].length,
        error: error.message,
      });
    }
  }

  const totalSent = results.reduce((sum, r) => sum + r.count, 0);
  const totalFailed = errors.reduce((sum, e) => sum + e.count, 0);

  console.log(
    `Email notification complete: ${totalSent} sent, ${totalFailed} failed across ${batches.length} batches`
  );

  if (errors.length > 0 && results.length === 0) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "All email batches failed",
        details: errors,
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Emails sent",
      totalSent,
      totalFailed,
      batches: results.length,
      errors: errors.length > 0 ? errors : undefined,
    }),
  };
}
