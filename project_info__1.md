# BugSpace (bounty-compass) — Email Automation Flow Investigation

## Investigation Scope
This report answers the specific question: **"Is there a current email automation flow? If so, how does it work?"**

## Result: YES — An email automation flow exists and is fully implemented

The codebase has a complete email notification pipeline that fires when a new bug bounty program is created by an employer. It is **not** a cron/scheduled automation — it is event-driven, triggered by the program creation action.

---

## The Email Automation Flow (Step by Step)

### Trigger Point
- **File**: `src/pages/EmployerDashboard.tsx` (line ~280, inside `handleSubmit`)
- **When**: An employer clicks "Submit for Approval" on a **new** program (not an edit). The notification is only sent on create, not on update.
- **Code**:
```typescript
// Create new program
await addProgram(payload, firebaseUser.uid, firebaseUser.email);
toast.success("Program published successfully!");

// Send email notifications to opted-in users (fire-and-forget)
const description = payload.bountyRange
  ? `${payload.companyName} · Bounty: ${payload.bountyRange}`
  : payload.companyName;
notifyUsersAboutNewProgram(payload.programName, description);
```

### Step 1 — Fetch Notifiable Emails
- **File**: `src/lib/emailNotificationService.ts` (function `fetchNotifiableEmails`)
- Reads **all documents** from the `users` Firestore collection
- Filters: only includes users where `data.email` is a valid string AND `data.notify !== false`
  - Default behavior: if a user document has no `notify` field, the user is **opted-in** (this is a key design choice — opt-out model)
- Returns: `string[]` of email addresses

### Step 2 — Call Netlify Serverless Function
- **File**: `src/lib/emailNotificationService.ts` (function `sendProgramNotification`)
- Makes a `POST` request to `/.netlify/functions/sendEmail`
- Payload shape:
```json
{
  "programName": "Acme Security",
  "description": "Acme Inc. · Bounty: $500 – $10,000",
  "emails": ["user1@example.com", "user2@example.com", ...]
}
```

### Step 3 — Serverless Email Sending (Resend API)
- **File**: `netlify/functions/sendEmail.js`
- This is a **Netlify Functions** serverless handler (Node.js)
- Uses the **Resend API** (`api.resend.com`) to send transactional emails
- **Key behaviors**:
  - **Rate limiting**: Emails sent one at a time with 300ms delay between each (~3 emails/sec)
  - **Batching**: Max 10 emails per batch, with a 2-second pause between batches
  - **Retry logic**: Up to 3 retries per email with exponential backoff (1s, 2s, 4s)
  - **Deduplication**: Emails are deduplicated before sending (case-insensitive)
  - **Validation**: Basic `@` check on each email
  - **Anti-spam**: Custom HTML email with proper structure, preheader text, unsubscribe footer ("You are receiving this email because you registered on BugSpace"), unique `X-Entity-Ref-ID` header per email
  - **Sender**: `BugSpace <noreply@bugspace.in>` with `reply_to: support@bugspace.in`
- Returns detailed response with `totalSent`, `totalFailed`, `batches`, `elapsedSeconds`, and individual `failedEmails`

### Step 4 — Error Handling (Fire-and-Forget)
- The `notifyUsersAboutNewProgram` function wraps everything in a try/catch
- **Crucially**: failures are logged to console but **never thrown** — email failures do not block program creation
- The `sendProgramNotification` function itself throws on non-OK HTTP responses from the Netlify function

---

## Architecture Diagram

```
EmployerDashboard.tsx (handleSubmit)
  │
  ├── 1. addProgram() → Firestore "programs" collection
  │
  └── 2. notifyUsersAboutNewProgram()  [FIRE-AND-FORGET]
        │
        ├── fetchNotifiableEmails()
        │     └── Firestore: collection("users")
        │           → filter: email exists && notify !== false
        │           → returns string[]
        │
        └── sendProgramNotification(programName, description, emails)
              └── POST /.netlify/functions/sendEmail
                    │
                    └── Netlify Serverless Function (sendEmail.js)
                          ├── Validate body, deduplicate emails
                          ├── Build HTML email via buildEmailHtml()
                          ├── Send sequentially with batching & rate limiting
                          │     └── Resend API (api.resend.com)
                          │           ├── 3 retries with exponential backoff
                          │           ├── 300ms delay between individual sends
                          │           └── 2s delay between 10-email batches
                          └── Return { totalSent, totalFailed, failedEmails[] }
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/EmployerDashboard.tsx` | UI for employer program creation; triggers `notifyUsersAboutNewProgram` on new program submit |
| `src/lib/emailNotificationService.ts` | Frontend service: fetches notifiable users from Firestore, calls the Netlify function |
| `netlify/functions/sendEmail.js` | Serverless backend: receives recipient list, sends via Resend API with rate limiting and retry |
| `netlify.toml` | Netlify config: declares `netlify/functions` as the functions directory |
| `src/lib/firebase.ts` | Firebase initialization (provides `db` used by emailNotificationService) |

---

## Non-Obvious Design Decisions

1. **Opt-out by default**: Users are opted into email notifications unless they explicitly have `notify: false` in their Firestore user document. Missing `notify` field = subscribed.

2. **Fire-and-forget pattern**: Email failures never affect the user experience of program creation. The employer sees "Program published successfully!" even if every single email fails. Errors are only logged to the browser console.

3. **No unsubscribe mechanism in code**: There is no UI or API endpoint exposed that lets a user set `notify: false`. This would need to be done directly in Firestore or via a yet-to-be-built settings page.

4. **New programs only**: The notification fires ONLY on `addProgram()` — never on `updateProgram()`. If an employer edits an existing program, no email is sent.

5. **All users, not just premium**: The `fetchNotifiableEmails` function queries the entire `users` collection without any premium/role filter. All registered researchers who haven't opted out will receive notifications.

6. **Single Resend API key**: The `RESEND_API_KEY` environment variable must be set in Netlify's environment. If missing, the function returns a 500 error.

7. **Sequential sending with delays**: Designed to stay under Resend's rate limits and improve deliverability by avoiding bulk-send spam classification.

8. **No dedicated "email preferences" Firestore field schema**: The `notify` field is checked but there's no migration or schema enforcement for it. It's implicitly optional.

---

## What Is NOT Automated

- **No scheduled/cron emails**: There is no recurring email automation (no weekly digest, no bounty deadline reminders, no inactivity nudges)
- **No transactional emails for other events**: Registration, password reset, bounty claim, referral completion — none of these trigger email notifications
- **No email verification flow**: The `notify` field is trusted as-is; there's no email verification before sending
- **No per-program notifications**: Users can't subscribe to specific programs; it's all-or-nothing

---

## Summary

**Yes, an email automation flow exists.** When an employer creates a new bug bounty program via the Employer Dashboard, the system:
1. Queries Firestore for all users opted into notifications
2. Calls a Netlify serverless function with the recipient list
3. The function sends individual HTML emails via the Resend API with rate limiting, batching, and retry logic

The flow is entirely event-driven (triggered by program creation), uses a fire-and-forget error model, and currently notifies ALL registered users by default (opt-out).
