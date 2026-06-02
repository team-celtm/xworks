# Security Rules for AI-Generated Apps

**By Taha Jaffri**

This guide provides a comprehensive security checklist of 12 rules plus AI-specific checks to be placed in the project root as `CLAUDE.md` or `.cursorrules`. Every app generated in this project must follow them strictly. No exceptions.

---

## 1. Secrets and Environment Variables

API keys hardcoded in frontend files are one of the most common ways apps get breached.

### Rule: Never expose secrets in frontend code
* Every API key, token, database URL, and private config lives in `.env` files only.
* `.env` files must always be listed in `.gitignore`. Ensure the `.gitignore` excludes `.env`, `.env.local`, and `.env.*.local`.
* Frontend code must never contain raw secret values (e.g., no `const API_KEY = "sk-..."` in client-side files).
* For Next.js or Vite: only variables prefixed with `NEXT_PUBLIC_` or `VITE_` belong in the frontend, and those must never be secret keys.
* Backend secrets are accessed via `process.env.VAR_NAME` only and are never returned to the client in API responses.
* Always maintain a `.env.example` file with all required variable names but empty values.
* If a secret must be used client-side (for example, a Stripe publishable key), add a comment explaining that it is a public key intentionally exposed.

#### Correct
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
```

#### Incorrect
```javascript
const stripe = require('stripe')('sk_live_abc123...');
```

---

## 2. Rate Limiting

Every public-facing endpoint needs rate limiting. Without it, auth routes can be brute-forced, AI costs can be run up, or upload endpoints can be flooded.

### Rule: Apply rate limiting on all API routes
* **Auth endpoints** (login, register, password reset): 5 requests per 15 minutes per IP.
* **General API**: 60 requests per minute per IP.
* **AI and LLM proxy endpoints**: 10 requests per minute per user.
* **File uploads**: 5 requests per minute per IP.
* Always return `429 Too Many Requests` with a `Retry-After` header when limits are hit.
* Never silently swallow rate limit errors on the frontend. Show the user a clear message.

#### Recommended libraries by stack:
* **Node / Express**: `express-rate-limit`
* **Next.js**: `next-rate-limit` or custom middleware with `lru-cache`
* **Python / FastAPI**: `slowapi`
* **Python / Flask**: `Flask-Limiter`
* **Edge / Vercel**: KV-based counters or Upstash Redis

```javascript
// Express rate limiting example
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);
```

---

## 3. Input Validation and Sanitization

Client-side validation is a UX convenience, not a security measure. Everything that matters happens on the server.

### Rule: Validate and sanitize everything on the server
* Use schema validation libraries: `Zod` or `Joi` for JS/TS, `Pydantic` for Python.
* Sanitize all string inputs before storing or displaying them to prevent XSS.
* Use parameterized queries or ORM methods. Never interpolate user input into raw SQL or NoSQL queries.
* Validate data type, length limits, allowed characters, required fields, and enum values.
* **For file uploads**: validate MIME type, file extension, and file size on the server.
* Reject invalid input with a clear `400 Bad Request` response and log the attempt.

```typescript
// Zod schema validation example
import { z } from 'zod';

const schema = z.object({
  email: z.string().email().max(254),
  message: z.string().min(1).max(1000).trim(),
});

const result = schema.safeParse(req.body);
if (!result.success) return res.status(400).json({ error: result.error });
```

---

## 4. Authentication and Authorization

Auth is where most apps fail. Do not roll your own from scratch. Use established libraries and check both identity and permissions on every request.

### Rule: Use established auth libraries and follow password rules
* **Recommended options**: NextAuth.js, Clerk, Supabase Auth, Auth0, Passport.js, lucia-auth.
* Passwords must never be stored in plain text. Use `bcrypt` (minimum cost 12) or `argon2`.
* JWTs must be signed with a strong secret stored in env (minimum 32 characters). Set short expiry of 15 to 60 minutes.
* Refresh tokens must be stored in `httpOnly` cookies, not `localStorage`.
* Verify the user identity and their permission to access the resource on every request.
* Implement account lockout after repeated failed login attempts.
* Add explicit role and permission checks on admin routes and sensitive operations.

```javascript
// Always check ownership, not just authentication
const post = await db.post.findUnique({ where: { id } });
if (!post || post.authorId !== session.user.id) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

## 5. SQL and Database Security

SQL injection is preventable. AI-generated code will happily concatenate user input into a query if you let it.

### Rule: Always use an ORM or parameterized queries
* Use Prisma, Drizzle, SQLAlchemy, or Mongoose. Never construct queries via string concatenation with user data.
* Apply the principle of least privilege: the database user should only have the permissions it actually needs.
* Sanitize and validate all fields before any database write.
* Never return raw database errors to the client as they leak schema information.

#### Safe Parameterized Query
```javascript
const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
```

#### Unsafe Query (Never do this)
```javascript
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

---

## 6. CORS Configuration

Wildcard CORS in production allows any website to make requests to your API on behalf of your users.

### Rule: Never use wildcard CORS in production
* Explicitly whitelist only the origins that should access your API.
* Restrict allowed HTTP methods to only what each endpoint needs.
* Use the credentials flag only when your app requires it.

```javascript
// Explicit CORS example
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true,
}));
```

---

## 7. HTTP Security Headers

Security headers provide standard browser-level protections.

### Rule: Always set security headers using helmet or equivalent
* **Content-Security-Policy (CSP)**: Restrict script and style sources.
* **X-Frame-Options**: `DENY` to prevent clickjacking.
* **X-Content-Type-Options**: `nosniff`.
* **Strict-Transport-Security (HSTS)**: Force HTTPS.
* **Referrer-Policy**: `strict-origin-when-cross-origin`.
* Remove the `X-Powered-By` header to avoid leaking framework information.

---

## 8. File Upload Security

File uploads are a significant attack surface. Validate everything on the server, store files safely, and never trust what the client tells you.

### Rule: Validate, rename, and store uploads safely
* Validate file type by MIME type and extension on the server. Never trust the client.
* Set strict file size limits: 5MB for images, 25MB for documents as a reasonable default.
* Store uploaded files outside the web root or in a cloud bucket like S3, GCS, or Cloudinary.
* Never serve user-uploaded files with executable permissions.
* Rename uploaded files to a UUID. Never use the original filename directly.
* Scan for malware if handling sensitive or public uploads.

---

## 9. Error Handling and Logging

Stack traces in production responses leak server directories, dependencies, and weak points to attackers.

### Rule: Never return internal errors to the client
* Return generic error messages to users: `"Something went wrong"` is sufficient.
* Log errors server-side with full context: timestamp, user ID if available, route, and sanitized input.
* Use a logging service in production: Sentry, Datadog, or Logtail.
* Use correct status codes: 4xx for client errors, 5xx for server errors. Do not use 500 for validation failures.

---

## 10. Dependency Security

Audit third-party packages regularly and pin dependency versions.

### Rule: Audit dependencies and pin versions in production
* Run `npm audit` or `pip-audit` after installing packages. Fix high and critical issues.
* Avoid packages that are unmaintained (no updates in two or more years for security-relevant libs).
* Pin dependency versions in production using `package-lock.json` or `requirements.txt`.
* Do not install packages with excessive permissions or suspicious install scripts without reviewing them.

---

## 11. XSS Prevention

Cross-site scripting happens when you render untrusted content as HTML.

### Rule: Never render dynamic user content as raw HTML
* Do not use `dangerouslySetInnerHTML` in React unless the content is fully sanitized with `DOMPurify`.
* Never use `eval()`, `new Function()`, or `innerHTML` with dynamic user content.
* Avoid inline script tags. Move JS to external files to enable CSP enforcement.

---

## 12. Deployment Checklist

Before every deploy, run through this checklist to catch final details:

* [ ] `.env` is not committed to git.
* [ ] All secrets are set in the hosting platform environment variable config.
* [ ] Debug mode and development logging are off in production.
* [ ] Database is not publicly exposed.
* [ ] HTTPS is enforced.
* [ ] Rate limiting is active on all public endpoints.
* [ ] CORS is restricted to known origins.
* [ ] Unused API routes are removed or protected.

---

## AI and LLM-Specific Rules

Prompt injection, cost attacks, and insecure rendering are real concerns in production AI apps.

### Rule: Treat LLM inputs and outputs like untrusted data
* Never send raw user input directly to an LLM. Sanitize it first to prevent prompt injection.
* Always set a `max_tokens` limit on LLM calls to prevent runaway costs.
* Store the API key server-side only. Route all LLM calls through your own backend, never from the browser.
* Log LLM usage (token counts) per user to detect abuse early.
* Implement per-user or per-session token budgets to prevent cost attacks.
* Validate and sanitize LLM output before rendering it in the UI. Generated HTML is an XSS risk.

---

## Quick Reference Table

| Security Area | Core Rule | Tools / Examples |
| :--- | :--- | :--- |
| **Secrets** | Keys in `.env` only. Never in frontend code. | `.gitignore`, `.env.example` |
| **Rate Limiting** | 5 req/15 min auth. 60 req/min general API. | `express-rate-limit`, `slowapi` |
| **Input Validation** | Server-side only. Schema validation required. | `Zod`, `Pydantic` |
| **Auth** | bcrypt min cost 12. JWT short expiry. `httpOnly` cookies. | `NextAuth`, `Clerk`, `lucia-auth` |
| **SQL Security** | ORM or parameterized queries only. No string concat. | `Prisma`, `Drizzle`, `SQLAlchemy` |
| **CORS** | No wildcard in production. Explicit origin whitelist. | `cors()` with origin config |
| **HTTP Headers** | CSP, HSTS, X-Frame-Options: `DENY`. | `helmet` (Node), `django-csp` |
| **File Uploads** | MIME + extension validation. UUID rename. Outside web root. | `multer`, S3, Cloudinary |
| **Error Handling** | Generic messages to client. Full context in logs. | `Sentry`, `Datadog`, `Logtail` |
| **Dependencies** | Audit after every install. Pin versions in production. | `npm audit`, `pip-audit` |
| **XSS** | No `dangerouslySetInnerHTML`. No `eval()`. No inline scripts. | `DOMPurify` |
| **Deploy Gate** | Run checklist before every ship. | See Section 12 |
| **AI / LLM** | Sanitize input. Server-side keys. Token budgets. | Server proxy, `max_tokens` |
