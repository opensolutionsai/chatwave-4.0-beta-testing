# Issue & Architecture Log #001: Hybrid Auth & Supabase RLS Fix

**Document Name**: `readme-2026-11-13-17-25-hybrid-auth-and-supabase-rls-fix.md`  
**Date**: November 13, 2026  
**Time**: 17:25 IST (05:25 PM)  
**Author / Engineers**: ChatWave Engineering Team & Antigravity AI  
**Scope**: Firebase Authentication, Supabase Third-Party Auth Integration, PostgreSQL Row-Level Security (RLS), Supabase Storage Security, Presence Beacons  
**Git Commit Name**: `"Fixed hybrid architecture: resolved Supabase RLS with cryptographic Firebase JWT verification, added synchronous token caching and authenticated tab-close beacons, and added documentation in chatwave-4.0-project-edit-details."`  
**Git Commit Hash**: `69337d4`  

---

## 1. Overview & Problem Statement

### 1.1 The User's Observation & Initial Doubts
During development, the user raised valid concerns regarding our hybrid architecture:
> *"I am doubting our hybrid architecture, because we use Firebase authentication and for Supabase we use Supabase third-party auth feature and connect it to Firebase authentication. But I think this connection is not working, and the RLS and this auth is not working properly. I have doubts on this, so check RLS and the image and the Firebase auth and Supabase auth and code."*

The user attached a screenshot from the **Supabase Dashboard** under **Authentication > Sign In / Providers > Third-Party Auth**, showing:
- Provider: **Firebase (ENABLED)**
- Firebase Project ID: `fir-chatwave-4-supa`
- Supabase System Notice:
  > *"Allow users to use Supabase with Firebase project. You'll need to setup RLS policies for all tables that you want to access with a Firebase JWT token. Additionally, you'll need to add custom code to set the authenticated role to all your present and future users. You can read more in the documentation."*

### 1.2 The Underlying Technical Conflict
1. **The Supabase Assumption**: In native Supabase Auth, every user's JSON Web Token (JWT) contains a specific claim: `"role": "authenticated"`. Supabase's API layer (PostgREST) reads this claim to switch the PostgreSQL session into the `authenticated` role. Built-in helper functions like `auth.uid()` and policies like `TO authenticated` rely entirely on this claim.
2. **The Firebase Reality**: Standard Firebase ID tokens **do not contain any `role` claim**. A raw Firebase ID token only contains:
   - `sub`: The user's Firebase UID
   - `aud`: The Firebase Project ID (`fir-chatwave-4-supa`)
   - `iss`: `https://securetoken.google.com/fir-chatwave-4-supa`
   - `email`: The user's email address
3. **The Common Pitfall / Myth**: Most online articles and documentation state that you *must* create a **Firebase Cloud Function** (`functions.auth.user().onCreate()`) using the Node.js `firebase-admin` SDK to manually call `admin.auth().setCustomUserClaims(uid, { role: 'authenticated' })`.
   - **The Catch**: Deploying Firebase Cloud Functions requires upgrading Firebase to the paid **Blaze (Pay-as-you-go)** plan with a credit card.
   - For an app running strictly on free tiers, there are no Cloud Functions, meaning **no Firebase token ever has `role: 'authenticated'`**.
4. **The Resulting Runtime Failures**:
   - Because the `role` claim was missing, PostgREST executed requests under the default PostgreSQL role: `anon`.
   - Any RLS policy targeting `TO authenticated` failed immediately.
   - Any RLS policy using `auth.uid()` failed because `auth.uid()` attempts to cast the subject to a UUID (`::uuid`), whereas Firebase UIDs are alphanumeric strings.
   - Updates to the `user_presence` table produced:
     `HTTP 401 Unauthorized: new row violates row-level security policy for table "user_presence"`.

### 1.3 The Client-Side Beacon Bug in `app.js`
In addition to the database policy mismatch, inspecting `app.js` revealed a critical bug in `sendBeaconOffline()`:
- Whenever a user closed their browser tab, refreshed, or navigated away, `window.addEventListener('pagehide')` and `window.addEventListener('beforeunload')` invoked `sendBeaconOffline()`.
- Inside `sendBeaconOffline()`, the code performed:
  ```javascript
  fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates"
    },
    body: payload,
    keepalive: true
  });
  ```
- **The Bug**: It passed `apikey: SUPABASE_ANON_KEY`, but **completely omitted the `Authorization: Bearer <firebase_id_token>` header**.
- As a direct consequence, every single tab close or page reload sent an unauthenticated request to Supabase, triggering a `401 Unauthorized` RLS error in the browser console.

### 1.4 The Storage Bucket Listing Warning
In the Supabase Dashboard, the Security Advisor displayed a persistent warning on the `chat-images` storage bucket:
> *"Clients can list all files in this bucket: A broad SELECT policy on storage.objects allows clients to retrieve a full list of files. Public buckets don’t need this and it may expose more data than intended."*
- Because the bucket was already marked `public: true`, images were already directly accessible over CDN via their URLs. Adding a database `SELECT` policy allowed clients to execute `supabase.storage.from('chat-images').list()`, potentially leaking conversation file directories.

---

## 2. Why We Did What We Did (Analysis of Constraints & Alternatives)

Before writing any code, we evaluated all architectural options against the project's strict non-negotiable requirements:
1. **Zero Cost / 100% Free**: No credit card, no paid Firebase Blaze plan, no paid SMTP services.
2. **Zero Compromise on Security**: ChatWave is an encrypted messaging platform. Wide-open RLS policies (`using true`) are forbidden because User A must never be able to tamper with User B's data, and unauthorized bots must not write to our database.
3. **Preserve Quotas**: Do not exceed Firebase free limits (20,000 writes/day).

### 2.1 Why Path A (Migrating Everything to Supabase Auth) Was Rejected
- **The Flaw**: Supabase Auth's free tier has an extremely strict email rate limit of **3 to 4 emails per hour**.
- **The Consequence**: In a consumer chat application where new users register, verify emails via OTP/magic links, or reset forgotten passwords, the built-in email service would stop working after just 4 attempts in an hour. To lift this limit, developers are required to subscribe to a custom SMTP provider (such as Resend, SendGrid, or AWS SES), which introduces billing setup, maintenance, and external complexity.
- **The Firebase Advantage**: Firebase Authentication provides **100% free, reliable, unlimited email OTPs/verification links, password resets, and seamless Google OAuth sign-in** out of the box with zero SMTP configuration. Keeping Firebase Auth is vastly superior for user experience and costs.

### 2.2 Why Path B (Moving Presence Tracking Back to Firestore) Was Rejected
- **The Flaw**: Cloud Firestore's free Spark plan provides a quota of **20,000 document writes per day**.
- **The Consequence**: Real-time presence systems generate a continuous stream of writes:
  - User opens app $\rightarrow$ write online.
  - User switches tabs or minimizes browser $\rightarrow$ write offline/last seen.
  - User returns to tab $\rightarrow$ write online.
  - Periodic heartbeats every 25 seconds $\rightarrow$ continuous writes.
  With only 10 to 20 active users chatting and switching tabs, 20,000 writes would be burned in 2 to 3 hours, causing Firestore to throw `RESOURCE_EXHAUSTED` and crashing the entire messaging app for the remainder of the day.
- **The Supabase Advantage**: Supabase Realtime WebSocket channels (`supabase.channel("online-users")`) handle presence broadcasts entirely in-memory on the Elixir/Phoenix server cluster with **zero database writes and <100ms latency**. The PostgreSQL table `user_presence` is only updated when persistent `last_seen` state changes.

### 2.3 The Architectural Decision: Secure Hybrid Without Paid Cloud Functions
Rather than abandoning the hybrid architecture or paying for Cloud Functions, we solved the problem at its root: **We configured PostgreSQL Row-Level Security in Supabase to inspect the raw, cryptographically verified Google JWT claims directly.**

---

## 3. The Breakthrough: Empirical Proof of Working Third-Party Auth

We conducted live automated tests against our actual Supabase database instance (`cejtngzybawccjqlaabq`) to verify how Supabase's API gateway handles Firebase tokens.

### How Supabase Processes the Firebase Token
1. When a client sends `Authorization: Bearer <firebase_id_token>`, Supabase's gateway detects that the issuer matches `https://securetoken.google.com/fir-chatwave-4-supa`.
2. It fetches Google's public JWKS certificates and **verifies the RSA cryptographic signature**.
3. If the token is valid, it decodes the payload into the Postgres session variable `request.jwt.claims`.
4. Inside Postgres, calling `auth.jwt()` exposes the full token JSON:
   - `auth.jwt() ->> 'aud'` = `'fir-chatwave-4-supa'` (The verified Firebase Project ID)
   - `auth.jwt() ->> 'sub'` = The user's authentic Firebase UID

### Live Test Results:
- **Test 1 (Legitimate User Update)**:
  - Created a test user in Firebase (`UID: eqpZIqSh...`).
  - Sent `POST /rest/v1/user_presence` with `Authorization: Bearer <firebase_id_token>` where `user_id = UID`.
  - **Result: `HTTP 201 Created`**. Supabase verified the token and successfully wrote the row!
- **Test 2 (Spoofing / Impersonation Attack)**:
  - Attacker signed in with their own valid Firebase token (`UID: ffRpbPG...`), but attempted to write to another user's row (`user_id = 'victim_user_99999'`).
  - **Result: `HTTP 401 Unauthorized`**.
    Response: `{"code":"42501", "message":"new row violates row-level security policy for table 'user_presence'"}`.
    Postgres RLS detected that `auth.jwt() ->> 'sub' != user_id` and blocked the attack instantly.
- **Test 3 (Unauthenticated Anonymous Visitor)**:
  - Sent a write request using only the public `anon` key without a Firebase token.
  - **Result: `HTTP 401 Unauthorized`**. The policy detected that `auth.jwt() ->> 'aud'` was NULL and blocked the request.

This proved beyond doubt that **the hybrid bridge is 100% functional, cryptographically secure, and completely free**.

---

## 4. The Exact SQL Executed in Supabase SQL Editor

The following SQL was run in the **Supabase Dashboard > SQL Editor** to establish the complete security model:

```sql
-- ══════════════════════════════════════════════════════════════
-- 1. USER PRESENCE TABLE & CRYPTOGRAPHIC RLS POLICIES
-- ══════════════════════════════════════════════════════════════
create table if not exists public.user_presence (
  user_id text primary key,
  is_online boolean default false,
  last_seen timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.user_presence enable row level security;

-- Drop any previous or conflicting presence policies
drop policy if exists "Anyone can read user presence" on public.user_presence;
drop policy if exists "Public read user presence" on public.user_presence;
drop policy if exists "Anyone can read presence" on public.user_presence;
drop policy if exists "Firebase users can update own presence" on public.user_presence;
drop policy if exists "Secure user presence self update" on public.user_presence;
drop policy if exists "Allow user_presence insert/update" on public.user_presence;

-- READ POLICY: Public read allows contacts to see online dots and last_seen timestamps
create policy "Anyone can read user presence"
on public.user_presence
for select
to anon, authenticated
using (true);

-- WRITE POLICY: Cryptographically enforces that ONLY a user with a valid Firebase JWT
-- issued by our exact project ('fir-chatwave-4-supa') can write to their OWN user_id row!
create policy "Firebase users can update own presence"
on public.user_presence
for all
to anon, authenticated
using (
  (auth.jwt() ->> 'aud') = 'fir-chatwave-4-supa'
  and (auth.jwt() ->> 'sub') = user_id
)
with check (
  (auth.jwt() ->> 'aud') = 'fir-chatwave-4-supa'
  and (auth.jwt() ->> 'sub') = user_id
);

-- ══════════════════════════════════════════════════════════════
-- 2. SAFE REALTIME PUBLICATION (AVOIDS ERROR 42710)
-- ══════════════════════════════════════════════════════════════
-- Initial execution threw: "ERROR: 42710: relation user_presence is already member of publication supabase_realtime".
-- We wrapped the alter publication statement in a procedural check to safely skip if already present:
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'user_presence'
  ) then
    alter publication supabase_realtime add table public.user_presence;
  end if;
end $$;

-- ══════════════════════════════════════════════════════════════
-- 3. CHAT STORAGE BUCKET STRICT RLS (chat-images)
-- ══════════════════════════════════════════════════════════════
-- Drop old or overly broad storage policies
drop policy if exists "Allow Firebase users to upload images" on storage.objects;
drop policy if exists "Allow image uploads to chat-images" on storage.objects;
drop policy if exists "Allow viewing of chat-images" on storage.objects;
drop policy if exists "Allow deleting chat-images" on storage.objects;

-- Strict INSERT policy: Only authenticated Firebase users can upload compressed chat images
create policy "Allow Firebase users to upload images"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'chat-images'
  and (auth.jwt() ->> 'aud') = 'fir-chatwave-4-supa'
  and (auth.jwt() ->> 'sub') is not null
);
```

### Explanation of the Publication Error (`ERROR 42710`)
During the first SQL run, PostgreSQL returned:
`Error: Failed to run sql query: ERROR: 42710: relation "user_presence" is already member of publication "supabase_realtime"`.
- In Postgres, executing `alter publication supabase_realtime add table ...` when the table is already a member throws error code `42710` (duplicate object) and aborts the transaction.
- We fixed this by querying `pg_publication_tables` inside a `DO $$ BEGIN ... END $$;` block. If the table is already registered for Realtime, the statement safely no-ops.

---

## 5. How We Fixed the Application Code in `app.js`

To make full use of the updated database policies, we made four key enhancements to `app.js`:

### 5.1 Synchronous In-Memory Firebase Token Cache
Firebase's `auth.currentUser.getIdToken()` is asynchronous. When unload events fire or when requests occur in rapid succession, awaiting a token dynamically can cause race conditions or fail during page tear-down.

We implemented an in-memory token cache:
```javascript
// ── SYNCHRONOUS FIREBASE TOKEN CACHE FOR SUPABASE CALLS ──
let cachedFirebaseToken = null;
let tokenRefreshTimer = null;

async function getFirebaseToken(forceRefresh = false) {
  if (!auth.currentUser) {
    cachedFirebaseToken = null;
    return null;
  }
  try {
    cachedFirebaseToken = await auth.currentUser.getIdToken(forceRefresh);
    return cachedFirebaseToken;
  } catch (err) {
    console.warn("Could not retrieve Firebase ID token:", err);
    return cachedFirebaseToken;
  }
}
```

### 5.2 Dynamic `accessToken` Hook on Supabase Client
The Supabase JavaScript SDK was configured to automatically pull from this cache on every REST and Storage request:
```javascript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  accessToken: async () => {
    return (await getFirebaseToken(false)) ?? null;
  }
});
```

### 5.3 Fixed `sendBeaconOffline()` with Authenticated Keepalive
We rewrote `sendBeaconOffline()` to attach the cached Firebase token in the `Authorization` header:
```javascript
function sendBeaconOffline() {
  if (!currentUser) return;
  const nowIso = new Date().toISOString();
  const url = `${SUPABASE_URL}/rest/v1/user_presence?apikey=${SUPABASE_ANON_KEY}`;
  const payload = JSON.stringify({
    user_id: currentUser.uid,
    is_online: false,
    last_seen: nowIso,
    updated_at: nowIso
  });
  
  const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
  };

  // Attach verified Firebase token so Postgres RLS check passes during unload
  if (cachedFirebaseToken) {
    headers["Authorization"] = `Bearer ${cachedFirebaseToken}`;
  }

  try {
    fetch(url, {
      method: "POST",
      headers,
      body: payload,
      keepalive: true
    }).catch(() => {});
  } catch {}
}
```
- **Why `fetch(..., { keepalive: true })` over `navigator.sendBeacon`?** `navigator.sendBeacon` does not allow custom HTTP headers like `Authorization`. Using `fetch` with `keepalive: true` is the W3C standard for sending authenticated unload beacons that outlive the page lifecycle.

### 5.4 Token Refresh Cycle & Lifecycle Cleanup
- In `onAuthStateChanged(auth, async (user) => ...)`:
  - On login: `await getFirebaseToken(true)` immediately warms the cache.
  - A timer (`tokenRefreshTimer`) refreshes the token every 45 minutes (well before the 60-minute expiration).
- In `window.doLogout` and the sign-out branch:
  - `sendBeaconOffline()` marks the user offline immediately.
  - `clearInterval(tokenRefreshTimer)` stops the background refresh.
  - `cachedFirebaseToken = null` flushes the cached credential.

---

## 6. Architecture & Quota Summary Matrix

| Capability | Provider | Security & Privacy Model | Quota / Free Tier Cost |
| :--- | :--- | :--- | :--- |
| **User Sign-up, Login, Reset** | Firebase Auth | Google Identity, Email Verification links/OTPs | 100% Free / Unlimited |
| **1:1 & Group Chat Messaging** | Cloud Firestore | WebCrypto ECDH + AES-GCM (End-to-End Encrypted) | Free Spark Plan (Cached via IndexedDB) |
| **Realtime Live Online Dot** | Supabase Realtime | Ephemeral WebSocket presence channel (`online-users`) | Free Tier / 0 Database Writes / <100ms |
| **Persistent Last Seen Time** | Supabase Postgres | Cryptographic JWT RLS (`aud='fir-chatwave-4-supa' & sub=user_id`) | Free Tier / Zero Firestore Writes |
| **WebRTC 1:1 Voice & Video Signaling** | Supabase Realtime | WebSocket broadcast channel (`user-call:${id}`) | Free Tier / Peer-to-Peer DTLS-SRTP |
| **Chat Images Storage** | Supabase Storage | Public bucket direct CDN + Token-verified INSERT policy | 1 GB Free Tier / Zero Directory Listing Leaks |
| **Profile Avatars & Group Icons** | Cloudinary | Unsigned preset with client-side WebP cropping (512x512) | 100% Free Tier (25 GB/month) |

---

## 7. Git Reference
- **Commit Hash**: `69337d4`
- **Branch**: `v4-hybrid-dev`
- **Commit Message**:
  > *"Fixed hybrid architecture: resolved Supabase RLS with cryptographic Firebase JWT verification, added synchronous token caching and authenticated tab-close beacons, and added documentation in chatwave-4.0-project-edit-details."*
- **Follow-up Commit**: Documentation update adopting the standardized naming format `readme-2026-11-13-17-25-hybrid-auth-and-supabase-rls-fix.md`.
