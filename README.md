# DEV@Deakin - Task D1 (Subscription)

React (Vite) frontend + Express backend + Firebase Firestore.

## What's new in D1
- **Register / Login through the backend** (`backend/server.js`): data is validated with Zod, passwords are hashed with bcrypt, users are stored in Firestore, and login returns a signed **JWT**.
- **Session management**: the JWT is stored in `localStorage` and shared across the site with React `useContext` (`src/context/AuthContext.jsx`). Logout clears it.
- **Pricing page** (`/pricing`): Free vs Premium comparison.
- **Upgrade Plan**: only logged-in Free users can open the payment modal; on valid details the backend sets `plan: "paid"` in Firestore. Users without a `plan` field are treated as Free.

## Backend API
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/register` | Validate, hash password, save user (plan = free) |
| POST | `/api/login` | Check credentials, return JWT + user |
| GET | `/api/me` | Restore session from JWT |
| POST | `/api/upgrade` | Validate payment details, set plan = paid |
| POST | `/signup` | SendGrid welcome email (Task P5) |

## Run it
```bash
# 1. Frontend (terminal 1)
cp .env.example .env              # fill in Firebase keys
npm install
npm run dev                       # http://localhost:5173

# 2. Backend (terminal 2)
cd backend
cp .env.example .env              # SendGrid keys + JWT_SECRET
npm install
npm start                         # http://localhost:3000
```
The backend reads the Firebase keys from the project-root `.env` (the same `VITE_FIREBASE_*` values), so nothing extra is needed.

Payment details are validated only and are **never stored**.
Do not commit `node_modules` or `.env` files (both are in `.gitignore`).
