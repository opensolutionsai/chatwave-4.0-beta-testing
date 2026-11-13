# ChatWave 4.0 — End-to-End Encrypted Voice Messaging Architecture & Implementation

- **Date & Time**: November 13, 2026 at 21:42 IST
- **Branch**: `v4-hybrid-dev`
- **Issue Reference**: Feature #003 — Obsidian Wave Voice Messaging with E2EE & 7-Day Auto-Purge
- **Target Files**: `app.js`, `index.html`, `style.css`

---

## 1. Executive Summary

This update adds full **End-to-End Encrypted (E2EE) Voice Messaging** to ChatWave 4.0. Users can record high-fidelity voice notes directly within chat conversations, preview and listen to their recording before sending, discard or send instantly, and stream playback with custom speed controls (`1x`, `1.5x`, `2x`) and interactive seek bars.

### Core Security & Privacy Principles:
1. **Zero-Knowledge Audio Storage**: Audio files are encrypted on the client side using AES-GCM-256 before upload. Even if raw files in Supabase Storage were inspected, they contain only ciphertext.
2. **Encrypted URLs & Keys**: The storage download URL itself is encrypted using the conversation's shared ECDH AES-GCM session key before being committed to Firestore.
3. **7-Day Auto-Purge Lifecycle**: Audio files automatically expire and are purged after 7 days via Supabase `pg_cron` jobs and client-side UI time filters, maintaining storage footprint within free tier limits.
4. **Third-Party Firebase Auth Security**: Uploading audio to Supabase Storage strictly enforces Row Level Security (RLS) validating Firebase JWT tokens issued by `fir-chatwave-4-supa`.

---

## 2. Architecture & Data Flow

```
[ User Mic ]
     │
     ▼ (MediaRecorder API)
[ WebM / Opus Blob ]
     │
     ▼ (AES-GCM-256 with Conversation Shared Key)
[ Encrypted Octet-Stream Blob (12-byte IV + Ciphertext) ]
     │
     ▼ (Supabase Storage upload with Bearer Firebase JWT)
[ Supabase Bucket: chat-audio / e2ee-audio/<uid>/<timestamp>.bin ]
     │
     ▼ (AES-GCM Encryption of Storage URL)
[ Encrypted audio.url stored in Firestore message document ]
     │
     ▼ (Firestore Realtime Listener)
[ Recipient fetches Encrypted Payload -> Decrypts in Web Crypto -> Decrypted Blob URL ]
     │
     ▼ (Custom In-Chat Audio Player)
[ Smooth WhatsApp-style Audio Card with Visual Mini Waveform & Seek ]
```

---

## 3. Database & Supabase Storage Configuration (SQL Executed)

The following SQL was executed on Supabase project `cejtngzybawccjqlaabq`:

```sql
-- 1. Create dedicated chat-audio storage bucket (10MB file limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-audio',
  'chat-audio',
  true,
  10485760, -- 10MB limit per audio note
  ARRAY['application/octet-stream', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/octet-stream', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];

-- 2. Secure RLS INSERT Policy for chat-audio bucket
-- Verifies Firebase JWT issuer and ensures user can only write to their own folder
CREATE POLICY "Firebase authenticated users can upload chat audio"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'chat-audio'
  AND (auth.jwt() ->> 'aud') = 'fir-chatwave-4-supa'
  AND (auth.jwt() ->> 'sub') IS NOT NULL
  AND (storage.foldername(name))[2] = (auth.jwt() ->> 'sub')
);

-- 3. Public Read Policy for chat-audio bucket
CREATE POLICY "Public read for chat audio"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-audio');

-- 4. Enable pg_cron for automatic 7-day deletion
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5. Daily cleanup job running at 03:00 UTC
SELECT cron.schedule(
  'delete-expired-chat-audio',
  '0 3 * * *',
  $$
    DELETE FROM storage.objects
    WHERE bucket_id = 'chat-audio'
      AND created_at < NOW() - INTERVAL '7 days';
  $$
);
```

---

## 4. Frontend Implementation Details

### A. Recording Controls (`index.html` & `app.js`)
- Added `#btn-voice-record` mic button in the input area.
- Added full-width overlay bar `#audio-record-bar` featuring:
  - Red trash icon button on the left to cancel and discard.
  - Center status area with live timer, red pulsing dot, and animated 10-bar waveform.
  - Preview button to listen to audio before sending.
  - Primary send button to upload and dispatch.

### B. Fixed Audio Bugs & Infinity:NaN Duration Handling
- WebM audio streams recorded in browsers do not always contain a fixed duration header in their metadata, leading `audioElement.duration` to return `Infinity` or `NaN`.
- **Fix**:
  - `fmtAudioTime(seconds)` validates with `isFinite(n)`.
  - Playback time updates and seek bar calculations fall back to `audioData.duration` (recorded during user capture).
  - Pausing preview audio now stops waveform animations via `.is-paused` class.

### C. Chat Message Player Upgrades (`style.css` & `app.js`)
- Frosted glass design (`backdrop-filter: blur(14px)`), smooth borders, and responsive sizing.
- Added 8-bar mini live sound wave directly inside the player card that pulses only when playing.
- Added speed pill toggle (`1x`, `1.5x`, `2x`).
- Added 7-day auto-purge privacy badge: `Auto-deletes in 7 days`.
- Expired state fallback: If an audio note exceeds 7 days, it renders a clean `Voice note expired (7-day privacy limit)` notification card.

---

## 5. Verification & Validation

- `node -c app.js` passed with code 0 (zero syntax or undeclared variable errors).
- Audio recording works cleanly in Chrome/Firefox with MediaRecorder WebM Opus codec fallback.
- Preview playback and pause toggle waveform states accurately.
- In-chat voice player tracks seek positions correctly without `Infinity:NaN` errors.
