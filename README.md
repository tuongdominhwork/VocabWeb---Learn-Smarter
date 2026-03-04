# Claude Vocab Web 📚

A full-stack SaaS vocabulary learning application with live tests, spaced repetition, and bilingual UI (Vietnamese + English).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TailwindCSS 3, Framer Motion 11 |
| State | Zustand 4 + React Query v5 |
| Forms | React Hook Form + Zod |
| i18n | i18next 23 (EN + VI) |
| Backend | Node.js / Express.js (ESM) |
| Database | Turso (libsql / SQLite cloud) |
| Auth | JWT Bearer + bcryptjs (12 rounds) |
| Email | Nodemailer |
| Real-time | Server-Sent Events (SSE) |
| Excel | SheetJS (xlsx) |

## Roles

- **Student** — Study vocab, daily quizzes, live tests, progress tracking
- **Teacher** — Manage classrooms, vocab, live tests, student feedback
- **Admin** — User management (lock/unlock), system overview

---

## Local Development

### Prerequisites

- Node.js 18+
- A free [Turso](https://turso.tech) account (for the database)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd claude-vocab-web

# Install all dependencies (root + server + client)
npm run install:all
```

### 2. Configure Server

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=4000
TURSO_URL=libsql://your-database-name-username.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Nodemailer (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=VocabWeb <your-gmail@gmail.com>
```

### 3. Configure Client

```bash
cp client/.env.example client/.env
```

`client/.env` is already correct for local dev:
```env
VITE_API_URL=http://localhost:4000
```

### 4. Set Up Database

```bash
# Run migrations (creates all tables)
npm run migrate

# Seed with demo data
npm run seed
```

### 5. Run Both Servers

```bash
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:4000

### Demo Accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | Password123 |
| Teacher | teacher@test.com | Password123 |
| Student | student@test.com | Password123 |

Demo classroom join code: **APPLE-1234**

---

## Project Structure

```
claude-vocab-web/
├── package.json          # Root scripts (concurrently)
├── server/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js              # Express entry point
│       ├── db/
│       │   ├── index.js          # Turso client + helpers
│       │   ├── migrations.js     # Schema creation
│       │   └── seed.js           # Demo data
│       ├── middleware/
│       │   ├── auth.js           # JWT + role guards
│       │   └── errorHandler.js
│       ├── controllers/          # Request handlers
│       ├── services/             # Rule engines
│       │   ├── QuizGeneratorService.js
│       │   ├── FeedbackEngine.js
│       │   └── HintService.js
│       └── routes/               # Express routers
└── client/
    ├── package.json
    ├── .env.example
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx               # Router
        ├── index.css             # Tailwind + component classes
        ├── api/axios.js          # Axios + interceptors
        ├── store/authStore.js    # Zustand auth
        ├── i18n/                 # EN + VI translations
        ├── components/           # Layout, Sidebar, Topbar
        └── pages/
            ├── Landing.jsx
            ├── auth/             # Login, Register, Reset
            ├── student/          # Dashboard, Study, Quiz, Progress, LiveTest
            ├── teacher/          # Dashboard, Classroom, Students, Vocab, Tests, Feedback
            └── admin/            # Dashboard, Users, Classrooms
```

---

## Deployment

### Frontend → Vercel

1. Push to GitHub
2. Connect repo on [vercel.com](https://vercel.com)
3. Set **Root Directory** to `client`
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`
5. Deploy

### Backend → Render (Free)

1. Create a new **Web Service** on [render.com](https://render.com)
2. Set **Root Directory** to `server`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. Add all environment variables from `server/.env.example`
6. Deploy

### Database → Turso (Free)

```bash
# Install Turso CLI
brew install tursodatabase/tap/turso

# Login
turso auth login

# Create a database
turso db create vocab-web

# Get credentials
turso db show vocab-web     # → TURSO_URL
turso db tokens create vocab-web  # → TURSO_AUTH_TOKEN
```

---

## Excel Import Template

Download the vocab import template from the running app:

```
GET /api/vocab/template
```

Or with curl:
```bash
curl -H "Authorization: Bearer <your-token>" http://localhost:4000/api/vocab/template -o vocab_template.xlsx
```

**Required columns**: `headword`, `level`, `part_of_speech`, `meaning_vi`  
**Optional columns**: `meaning_en`, `ipa`, `example_sentence`, `notes`

Valid levels: `A1`, `A2`, `B1`, `B2`, `C1`, `C2`

---

## Quiz Types

| Type | Description |
|------|-------------|
| `flashcard` | Flip card — see English word, reveal Vietnamese meaning |
| `mcq` | Multiple choice — 4 options, 3 distractors from same level |
| `typing` | Type the English headword from the Vietnamese meaning |
| `spelling` | Rearrange scrambled middle letters |
| `fill_blank` | Fill in the headword in an example sentence |
| `matching` | Match 4 English words to their Vietnamese meanings |

## Mastery System

- A word is **mastered** when: accuracy ≥ 80% AND correct count ≥ 3
- **Hint Level 1** unlocks after 3 wrong attempts: first letter + word length
- **Hint Level 2** adds: partial meaning + example with blank

---

## Environment Variables Reference

### Server

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 4000) |
| `TURSO_URL` | libSQL database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `JWT_SECRET` | Secret for signing JWTs |
| `CORS_ORIGIN` | Allowed frontend origin |
| `FRONTEND_URL` | Used in password reset emails |
| `SMTP_HOST` | Email server host |
| `SMTP_PORT` | Email server port |
| `SMTP_USER` | Email username |
| `SMTP_PASS` | Email password / app password |
| `SMTP_FROM` | From address in emails |

### Client

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
# VocabWeb---Learn-Smarter
