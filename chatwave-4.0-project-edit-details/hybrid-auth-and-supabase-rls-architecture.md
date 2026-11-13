# ChatWave 4.0 — Hybrid Architecture & Supabase RLS Fix Details

## 1. Executive Summary
This document records the exact issue, architectural analysis, decision-making rationale, and technical solution implemented for ChatWave 4.0's hybrid backend architecture combining **Firebase Authentication** and **Supabase (Realtime Presence, Postgres RLS, and Media Storage)**.

---

## 2. The Issue: Why Doubts Arose

### 2.1 The Symptoms
During development and testing, several red flags appeared:
1. Supabase Dashboard displayed a notice under **Authentication > Third-Party Auth > Firebase**:
   > *"Additionally, you'll need to add custom code to set the authenticated role to all your present and future users."*
2. Presence database updates and browser tab-close beacon requests repeatedly failed with:
   `HTTP 401 Unauthorized: new row violates row-level security policy for table "user_presence"`.
3. The storage bucket for chat images displayed listing warnings when open `SELECT` policies were used.
4. There was doubt whether Supabase was actually recognizing logged-in Firebase users or treating them all as anonymous visitors.

### 2.2 The Root Cause
- In native Supabase Auth, every user's JWT has a claim `"role": "authenticated"`. Supabase Postgres RLS policies typically check `TO authenticated`.
- Firebase ID tokens **do not** include a `role` claim by default. They contain `sub` (user UID), `aud` (Firebase project ID), `email`, and `iss`.
- Standard documentation suggests deploying a **Firebase Cloud Function** (`onCreate`) to inject `{ role: 'authenticated' }` into Firebase user tokens.
- Furthermore, in `app.js`, `sendBeaconOffline()` was executing raw `fetch` and `navigator.sendBeacon` calls with **only the public anon key and NO `Authorization` header**, causing every tab closure or page exit to fail Postgres RLS with a 401 error.

---

## 3. Why Other Paths Were Rejected (Cost & Security Analysis)

When considering how to resolve this, two naive alternative paths were analyzed and rejected:

### ❌ Rejected Path A: Full Migration to Supabase Auth
- **Why it failed**: Supabase Auth's free tier allows sending only **3 to 4 confirmation/reset emails per hour**. To support standard consumer messaging onboarding (email OTPs, verification emails, password resets), a custom SMTP provider (e.g., Resend, SendGrid) would have to be purchased and configured.
- **Firebase Auth advantage**: Firebase Auth provides **100% free, unlimited email verification links/OTPs, password resets, and one-click Google Sign-in** with zero SMTP configuration.

### ❌ Rejected Path B: Moving Presence Tracking Back to Firestore
- **Why it failed**: Firestore's free Spark plan limits writes to **20,000 document writes per day**. Presence tracking (online heartbeats, switching tabs, page active/inactive states) generates dozens of writes per active session. A handful of active users would exhaust the entire daily quota in hours.
- **Supabase Realtime advantage**: Supabase WebSocket channels handle millions of presence broadcasts with **zero database writes**, while the Postgres `user_presence` table only needs to store persistent `last_seen` timestamps.

### 🔒 Non-Negotiable Constraint: Zero Security Compromise
ChatWave is an encrypted messaging platform. We cannot use wide-open `using (true)` write policies, nor can we allow any user to spoof or overwrite another user's online state. User isolation must be mathematically and cryptographically guaranteed.

---

## 4. The Breakthrough: Empirical Proof of Working Third-Party Auth

Through deep analysis and live testing against our live Supabase project (`cejtngzybawccjqlaabq`), we proved that **Supabase Third-Party Auth DOES verify Firebase tokens cryptographically without paid Cloud Functions**:

1. Because Firebase is enabled under Supabase Third-Party Auth with Project ID `fir-chatwave-4-supa`, Supabase's API gateway verifies the RSA signature of every incoming Firebase ID token against Google's public JWKS certificates.
2. If a token is forged, expired, or invalid, Supabase blocks it immediately.
3. If the token is authentic, PostgreSQL makes the verified claims available via `auth.jwt()`:
   - `auth.jwt() ->> 'aud'` = `'fir-chatwave-4-supa'` (Authentic Project ID)
   - `auth.jwt() ->> 'sub'` = User's verified Firebase UID

### Automated Test Evidence Run on the Live Database:
- **Test 1 (Legitimate Firebase User)**: Sent `POST /rest/v1/user_presence` with a valid Firebase ID token matching `user_id`. **Result: HTTP 201 Created (Success)**.
- **Test 2 (Spoofing / Impersonation Attack)**: Attacker sent their valid Firebase token, but tried to overwrite a different user's row (`victim_user_99999`). **Result: HTTP 401 Unauthorized (Blocked by RLS)**.
- **Test 3 (Unauthenticated Visitor)**: Request with only the public anon key. **Result: HTTP 401 Unauthorized (Blocked by RLS)**.

---

## 5. How We Fixed It (Implementation Details)

### 5.1 Database Layer (Supabase SQL)
The following SQL was executed to enforce strict cryptographic user isolation:

```sql
-- 1. Table structure
create table if not exists public.user_presence (
  user_id text primary key,
  is_online boolean default false,
  last_seen timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_presence enable row level security;

-- 2. Clean up conflicting policies
drop policy if exists "Anyone can read user presence" on public.user_presence;
drop policy if exists "Public read user presence" on public.user_presence;
drop policy if exists "Anyone can read presence" on public.user_presence;
drop policy if exists "Firebase users can update own presence" on public.user_presence;
drop policy if exists "Secure user presence self update" on public.user_presence;
drop policy if exists "Allow user_presence insert/update" on public.user_presence;

-- 3. Public Read: Anyone can read online dots and last_seen
create policy "Anyone can read user presence"
on public.user_presence
for select
to anon, authenticated
using (true);

-- 4. Cryptographic Write: Only the verified owner can write their own row
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

-- 5. Safe Realtime Publication check (avoids ERROR 42710)
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

-- 6. Storage Bucket Upload Security (chat-images)
drop policy if exists "Allow Firebase users to upload images" on storage.objects;
drop policy if exists "Allow image uploads to chat-images" on storage.objects;
drop policy if exists "Allow viewing of chat-images" on storage.objects;
drop policy if exists "Allow deleting chat-images" on storage.objects;

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

### 5.2 Application Layer (`app.js`)
We updated `app.js` with the following architectural fixes:

1. **Synchronous Firebase Token Cache (`cachedFirebaseToken`)**:
   - Added `getFirebaseToken(forceRefresh)` to keep an in-memory token ready at all times.
   - Initialized immediately on `onAuthStateChanged`.
   - Automatically refreshed every 45 minutes to prevent token expiration before the 60-minute cutoff.
   - Cleaned up on logout.

2. **Fixed `sendBeaconOffline()` on Tab Close / Unload**:
   - Replaced raw unauthenticated requests with an authenticated `fetch(..., { keepalive: true })`:
     ```javascript
     const headers = {
       "apikey": SUPABASE_ANON_KEY,
       "Content-Type": "application/json",
       "Prefer": "resolution=merge-duplicates"
     };
     if (cachedFirebaseToken) {
       headers["Authorization"] = `Bearer ${cachedFirebaseToken}`;
     }
     fetch(url, { method: "POST", headers, body: payload, keepalive: true });
     ```
   - Removed `navigator.sendBeacon` because it cannot attach custom `Authorization` headers.

3. **Supabase Client `accessToken` Hook**:
   - Configured `accessToken: async () => await getFirebaseToken(false)`.
   - Now, both `user_presence.upsert()` and `supabase.storage.from("chat-images").upload()` seamlessly attach the Firebase JWT.

---

## 6. Architecture Verification Matrix

| Feature | Provider | Security Mechanism | Quota / Cost |
| :--- | :--- | :--- | :--- |
| **Authentication** | Firebase Auth | Google Identity / Email Verification / Passwords | 100% Free / Unlimited |
| **Messaging & Chats** | Firestore | WebCrypto ECDH + AES-GCM (End-to-End Encrypted) | IndexedDB Cached / Minimal Reads |
| **Live Online Dot** | Supabase Realtime | Ephemeral WebSocket presence channel (`online-users`) | 0 DB writes / <100ms latency |
| **Last Seen Timestamp** | Supabase Postgres | Cryptographic JWT RLS (`aud='fir-chatwave-4-supa' & sub=user_id`) | Free Tier / Zero Firestore writes |
| **Calling Signaling** | Supabase Realtime | WebSocket broadcast channel (`user-call:${id}`) | Free Tier / Peer-to-Peer DTLS-SRTP |
| **Chat Media** | Supabase Storage | Public bucket direct CDN + Token-verified INSERT check | 1 GB Free Tier / Zero listing leak |
| **Profile Avatars** | Cloudinary | Unsigned preset + Client WebP crop & compression | Free Tier |
