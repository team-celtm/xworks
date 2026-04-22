# Deployment Guide: Backend on Railway, Frontend on Vercel

This guide explains how to run:
- Backend API on Railway
- Frontend (Next.js UI) on Vercel

It is written for this project and includes the environment variables used in the codebase.

---

## 1) Recommended Architecture

- `frontend` (Vercel): serves your Next.js pages and calls backend APIs.
- `backend` (Railway): serves API endpoints and connects to PostgreSQL.
- Shared database: Railway Postgres (or any managed Postgres).

If your backend logic is still inside `app/api/*` in Next.js, move that logic to a dedicated backend service first (for example Express/Nest/Fastify) so Railway can host it independently.

---

## 2) Prerequisites

- GitHub repository with separate frontend and backend code (or two folders).
- Railway account and project.
- Vercel account and project.
- PostgreSQL database URL.
- Domain names (optional but recommended for production).

---

## 3) Environment Variables Checklist

Use the same variable names in deployment that your code expects.

### Backend (Railway) variables

- `DATABASE_URL`
- `SESSION_SECRET`
- `JWT_SECRET` (if your API uses JWT in addition to session cookies)
- `SMTP_HOST`
- `SMTP_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `SMTP_FROM`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_BASE_URL` (set to your frontend URL where needed by current auth flow)

### Frontend (Vercel) variables

- `NEXT_PUBLIC_BASE_URL` = your frontend URL (for example `https://app.example.com`)
- `NEXT_PUBLIC_API_BASE_URL` = your backend URL (for example `https://api.example.com`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

Notes:
- Do not commit `.env` files to Git.
- Generate new production secrets; do not reuse development secrets.
- Keep `NEXT_PUBLIC_*` only for values safe to expose in browser code.

---

## 4) Deploy Backend to Railway

1. Create a new Railway project.
2. Add your backend service from GitHub.
3. Set start/build commands based on backend framework, for example:
   - Build: `npm run build`
   - Start: `npm run start`
4. Add all backend environment variables from the checklist.
5. Attach PostgreSQL:
   - Use Railway Postgres plugin or external provider.
   - Set `DATABASE_URL`.
6. Deploy and copy backend public URL (for example `https://api-production.up.railway.app`).

### Backend production checks

- Health endpoint returns 200 (`/health` recommended).
- API endpoint test succeeds from Postman/cURL.
- Database read/write works.
- CORS allows frontend domain.
- Cookies/sessions configured for HTTPS and cross-site usage if needed.

---

## 5) Deploy Frontend to Vercel

1. Create/import project in Vercel from GitHub.
2. Set root directory to frontend app.
3. Framework preset: Next.js.
4. Add frontend environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` = Railway backend URL
   - `NEXT_PUBLIC_BASE_URL` = Vercel frontend URL
   - other `NEXT_PUBLIC_*` keys listed above
5. Deploy.
6. Add custom domain if needed.

---

## 6) Connect Frontend to Railway Backend

Your frontend should call backend routes using `NEXT_PUBLIC_API_BASE_URL` instead of relative `/api` paths.

Example:

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const res = await fetch(`${API_BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  credentials: "include",
});
```

If you are currently using Next.js Route Handlers under `app/api/*`, those routes run on Vercel by default. Move those handlers to your Railway backend service to complete the split architecture.

---

## 7) CORS and Cookie Settings (Important)

For backend hosted on Railway and frontend on Vercel:

- Allow frontend origin only:
  - Production: `https://your-frontend-domain`
  - Preview: `https://*.vercel.app` (only if truly needed)
- Allow credentials if using session cookies.
- Set cookies with:
  - `secure: true` in production
  - `sameSite: "none"` when cross-site cookie usage is required
  - `httpOnly: true`

---

## 8) Google OAuth Configuration

In Google Cloud Console:

- Authorized JavaScript origins:
  - Frontend domain (Vercel)
- Authorized redirect URIs:
  - Backend callback endpoint on Railway (for example `https://api.example.com/auth/google/callback`)

Make sure the callback URL in code matches exactly.

---

## 9) Razorpay Configuration

- Store secret keys only in backend (Railway).
- Keep publishable/public key in frontend as `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
- Configure Razorpay webhook URL to Railway backend endpoint.
- Set `RAZORPAY_WEBHOOK_SECRET` in Railway.

---

## 10) Final Go-Live Checklist

- Frontend loads from Vercel domain.
- Frontend can call backend Railway API.
- Login/register works.
- Session persists across page refresh.
- Email flow works (forgot password / verification).
- Payments and webhook validation work.
- DB migrations/schema are up to date.
- Error monitoring/logging enabled.

---

## 11) Suggested CI/CD Flow

- `main` branch:
  - Auto deploy backend to Railway
  - Auto deploy frontend to Vercel
- Pull Requests:
  - Vercel preview deployments for UI validation
  - Optional Railway staging service for API validation

---

## 12) Troubleshooting

- `401/403` after login:
  - Check cookie flags, domain, and CORS credentials settings.
- OAuth redirect mismatch:
  - Verify exact callback URL in Google Console and backend env.
- `500` on API:
  - Check Railway logs and missing env variables.
- Payment verification failure:
  - Confirm `RAZORPAY_KEY_SECRET` and webhook secret.
- DB connection issues:
  - Verify `DATABASE_URL`, SSL requirements, and network allow rules.

