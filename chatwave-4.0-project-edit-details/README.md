# ChatWave 4.0 — Project Edit Details & Architecture Log

This directory contains in-depth documentation of major architectural decisions, bug investigations, security models, and code modifications made to ChatWave 4.0.

---

### Index of Records

1. [Issue #001: Hybrid Auth & Supabase RLS Fix](./readme-2026-11-13-17-25-hybrid-auth-and-supabase-rls-fix.md)
   - **File**: `readme-2026-11-13-17-25-hybrid-auth-and-supabase-rls-fix.md`
   - **Date & Time**: November 13, 2026 at 17:25 IST
   - **Git Commit**: `69337d4` / `71c06f1`
   - **Topic**: Complete resolution of Firebase Auth + Supabase Third-Party Auth integration, eliminating RLS 401 errors, SQL policies, authenticated keepalive tab-close beacons, and zero-Firestore-write presence.

2. [Issue #002: New Group Modal ReferenceError Fix](./readme-2026-11-13-18-53-new-group-modal-reference-error-fix.md)
   - **File**: `readme-2026-11-13-18-53-new-group-modal-reference-error-fix.md`
   - **Date & Time**: November 13, 2026 at 18:53 IST
   - **Git Commit**: (Current)
   - **Topic**: Fixed critical bug in group creation flow caused by missing `newGroupPhotoURL` declaration in ES module strict mode, unblocking the "+ New Group" modal.
