# ChatWave 4.0 — Project Edit Details & Architecture Log

This directory contains in-depth documentation of major architectural decisions, bug investigations, security models, and code modifications made to ChatWave 4.0.

---

### Index of Records

1. [Hybrid Auth & Supabase RLS Architecture Fix](./hybrid-auth-and-supabase-rls-architecture.md)
   - **Topic**: Investigation and complete resolution of Firebase Auth + Supabase Third-Party Auth integration.
   - **Key Components**: Cryptographic token inspection in Postgres RLS, zero-Firestore-write presence system, synchronous client token cache, and keepalive unload beacon.
   - **Date**: November 2026
