# XWORKS — Deployment Guide

---

## 1. Requirements

- Node.js 18+
- npm
- A [Vercel](https://vercel.com) account
- A [Railway](https://railway.app) PostgreSQL database

---

## 2. Environment Variables

Create a `.env.local` file in the project root and fill in these values:

```env
DATABASE_URL=postgresql://user:password@host:port/dbname

SMTP_HOST=smtp.zeptomail.in
SMTP_PORT=465
EMAIL_USER=emailapikey
EMAIL_PASS=your_zepto_api_key
SMTP_FROM="XWORKS Team" <noreply@yourdomain.com>

GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

RAZORPAY_KEY_ID=rzp_live_your_key        ← use live key in production
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_your_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

JWT_SECRET=your_random_secret            ← generate with command below
```

**Generate JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Run Locally

```bash
npm install
npm run dev
```

Open → http://localhost:3000

---

## 4. Build for Production

```bash
npm run build
npm run start
```

Make sure there are no build errors before deploying.

---

## 5. Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

Then in the **Vercel Dashboard → Settings → Environment Variables**, add all variables from Step 2.

---

## 6. Google OAuth — Update Redirect URI

In [Google Cloud Console](https://console.cloud.google.com):

- Go to **APIs & Services → Credentials → OAuth 2.0 Client**
- Add this to **Authorized redirect URIs**:
  ```
  https://your-app.vercel.app/api/auth/google/callback
  ```

---

## 7. Before Going Live — Checklist

- [ ] Switched Razorpay to **live keys** (`rzp_live_*`)
- [ ] `JWT_SECRET` is set to a strong random value
- [ ] All env variables are set in Vercel dashboard
- [ ] Google OAuth redirect URI is updated to production URL
- [ ] Home page, Login, and Payment flow tested
- [ ] Admin portal accessible at `/admin`
- [ ] Email sending verified

---

## Tech Stack

| Part | Tech |
|---|---|
| Framework | Next.js 16, React 19 |
| Database | PostgreSQL (Railway) |
| Auth | Google OAuth + JWT |
| Payments | Razorpay |
| Email | ZeptoMail (SMTP) |
| Hosting | Vercel |
