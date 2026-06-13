# BugSpace (bounty-compass) — Email Automation Flow Investigation

## Result: YES — An email automation flow exists and is fully implemented

The codebase has a complete email notification pipeline that fires when a new bug bounty program is created by an employer. It is **event-driven** (triggered by program creation), not a cron/scheduled automation.

---

## The Flow (Step by Step)

### Trigger Point
- **File**: `src/pages/EmployerDashboard.tsx` (inside `handleSubmit`)
- When an employer clicks "Submit for Approval" on a **new** program, after `addProgram()` succeeds:
```typescript
await addProgram(payload, firebaseUser.uid, firebaseUser.email);
toast.success("Program published successfully!");

const description = payload.bountyRange
  ? `${payload.companyName} · Bounty: ${payload.bountyRange}`
  : payload.companyName;
notifyUsersAboutNewProgram(payload.programName, description);
```
- **Only fires on create, not on edit/update**

### Step 1 — Fetch Notifiable Emails from Firestore
- **File**: `src/lib/emailNotificationService.ts` → function `fetchNotifiableEmails()`
- Reads ALL documents from the `users` Firestore collection
- Filter: `data.email` is a string AND `data.notify !== false`
- **Opt-out model**: if `notify` field is missing, the user is considered opted-in

### Step 2 — POST to Netlify Serverless Function
- **File**: `src/lib/emailNotificationService.ts` → function `sendProgramNotification()`
- `POST /.netlify/functions/sendEmail` with `{ programName, description, emails[] }`

### Step 3 — Serverless Email Dispatch via Resend API
- **File**: `netlify/functions/sendEmail.js`
- Sends individual HTML emails via **Resend** (`api.resend.com`)
- **Rate limiting**: 300ms delay between emails (~3/sec), 2s pause every 10 emails
- **Retry**: up to 3 attempts per email with exponential backoff (1s → 2s → 4s)
- **Deduplication**: case-insensitive dedup of recipient list
- **Sender**: `BugSpace <noreply@bugspace.in>`, reply-to: `support@bugspace.in`
- **Anti-spam**: proper HTML structure, preheader, unique `X-Entity-Ref-ID`, footer explaining why user received the email

### Step 4 — Error Handling
- `notifyUsersAboutNewProgram()` catches all errors silently (console.error only)
- Email failures **never block program creation** — fire-and-forget pattern

---

## Architecture Diagram

```
EmployerDashboard.tsx (handleSubmit)
  ├── addProgram() → Firestore "programs"
  └── notifyUsersAboutNewProgram() [FIRE-AND-FORGET]
        ├── fetchNotifiableEmails() → Firestore "users" (notify !== false)
        └── sendProgramNotification()
              └── POST /.netlify/functions/sendEmail
                    └── Resend API (sequential, batched, retried)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/EmployerDashboard.tsx` | Program creation UI; triggers notification on submit |
| `src/lib/emailNotificationService.ts` | Fetches notifiable users + calls Netlify function |
| `netlify/functions/sendEmail.js` | Serverless email sender via Resend API |
| `netlify.toml` | Declares functions directory |
| `src/lib/firebase.ts` | Firebase init (provides `db`) |

---

## Non-Obvious Design Decisions

1. **Opt-out by default** — missing `notify` field = subscribed
2. **Fire-and-forget** — email failures never block program creation
3. **No unsubscribe UI** — users can't toggle `notify: false` from the app
4. **New programs only** — `addProgram()` triggers it; `updateProgram()` does not
5. **All users notified** — no premium/role filter applied
6. **Sequential with delays** — avoids Resend rate limits and spam classification
7. **No other email automations exist** — no cron jobs, no registration/verification/referral emails

---

## What Is NOT Automated

- No scheduled/cron emails (digests, reminders, nudges)
- No transactional emails for registration, password reset, or referrals
- No email verification before sending
- No per-program subscription preferences

The full report has been saved to `project_info__1.md`.