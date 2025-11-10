## MunicipalLabs-CRM

Modern, lightweight CRM for municipal teams by MunicipalLabs. It centralizes constituent email conversations from Gmail, streamlines triage and replies, and gives leadership clear visibility into topics and trends.

### Highlights

- **Gmail inbox triage**: List inbox items, open full threads/messages, and resolve IDs if you paste the wrong kind (thread vs message).
- **Reply workflow**: Threads table with filters and a reply drawer to respond quickly.
- **Insights**: Dashboard KPIs, topic distribution, and stance trend charts.
- **Administration**: Manage topics in an admin area.
- **Secure auth**: NextAuth with Google OAuth; access tokens auto-refreshed using the refresh token.

---

### Tech Stack

- Next.js (App Router) + TypeScript
- NextAuth (JWT) with Google provider
- Tailwind-based UI components (shadcn/ui style) and charts

---

### Quick Start

1. Requirements

- Node 18.17+ (Node 20 LTS recommended)

2. Install

```bash
# with pnpm (recommended)
pnpm install

# or npm
npm install
```

3. Environment
   Create a `.env.local` in the repo root:

```bash
NEXTAUTH_SECRET=generate-a-random-string-bro
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

4. Google OAuth Setup

- Create a Google Cloud project and enable “Gmail API”.
- Configure OAuth consent screen (add test users during development).
- Create “OAuth Client ID” (Web application).
- Authorized redirect URI (local): `http://localhost:3000/api/auth/callback/google`
- Scopes used:
  - `openid email profile`
  - `https://www.googleapis.com/auth/gmail.readonly`

5. Run

```bash
pnpm dev
# or
npm run dev
```

App runs at `http://localhost:3000`

---

### Authentication

- Sign in page: `/api/auth/signin`
- Sign out: `/api/auth/signout`
- Callback (Google): `/api/auth/callback/google`

This project uses JWT sessions. Access tokens are refreshed automatically when expired using the Google refresh token.

---

### API Routes (Server)

- Inbox list: `GET /api/gmail/inbox`
- Message by id: `GET /api/gmail/messages/{id}`
  - Optional: `?debug=1` to return a structured debug payload.
- Thread by id: `GET /api/gmail/threads/{id}`
- Resolve/test IDs and account: `GET /api/gmail/inbox/resolve`
  - Optional: `?id={messageOrThreadId}` to test a specific id.

All routes require a valid session; tokens are fetched via NextAuth and refreshed when needed.

---

### App Routes (UI)

- Dashboard: `/dashboard`
- Threads: `/threads`
- Admin: `/admin` and `/admin/topics`

---

### Scripts

```bash
pnpm dev       # start dev server
pnpm build     # production build
pnpm start     # start production server (after build)
pnpm lint      # run linter
```

(npm equivalents: `npm run dev`, etc.)

---

### Development Notes

- Dynamic API routes await `params` per Next.js 16 App Router requirements.
- Gmail tokens are not stored server-side; the app proxies to Gmail with the user’s access token.
- Set `NEXTAUTH_SECRET` to a strong random string in production.

---

### Troubleshooting

- 401 Unauthorized: ensure you’re signed in and environment variables are set correctly.
- Google OAuth errors: confirm the redirect URI matches exactly and the Gmail API is enabled.
- Empty inbox responses: verify the signed-in Google account actually has recent INBOX messages.

---

built by [aikhan jumashukurov](https://aikhanjumashukurov.com)
princeton cs · ai researcher · kyrgyz government innovation recognition.

© MunicipalLabs. All rights reserved.
