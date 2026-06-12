# CoinArchive External Submissions — Project Status

## Completed Features
- [x] Contributor auth: register, verify, resend, login
- [x] `GET /auth/me` — current contributor profile
- [x] `POST /auth/logout` — revoke Bearer session
- [x] Register/login transient rate limiting
- [x] Structured `PENDING_APPROVAL` login response
- [x] Password reset: forgot-password + reset-password + HTML email
- [x] DB v1.7 password reset token columns
- [x] Transactional email via `wp_mail()` only
- [x] Bearer token sessions (7-day expiry)
- [x] Email verification (hashed token, 24h expiry)
- [x] Submission, admin, import APIs (existing)
- [x] Contributor lifecycle emails (verified, approved, rejected)
- [x] `POST /ai/descriptions` — Gemini AI coin descriptions (backend-only, wp-config key)
- [x] AI descriptions respect `content_language`, `language_instruction`, and `historical_background`
- [x] Taxonomy options filter Polylang terms by `lang` / `content_language`
- [x] Submissions store and expose `content_language` for admin review
- [x] Admin review exposes translation status and contributor pending cancellation
- [x] Submission `content_language` synced to Polylang post language via `pll_set_post_language`
- [x] New fields mapped end-to-end: `coin_designer`, `coin_issue_status`, `coin_source_name`, `coin_source_url`, `coin_series`
- [x] `coin_series` comma-free canonical terms + legacy alias resolution (EN/DE)
- [x] WP cleanup: removed bad `Unity` / `Justice and Freedom` terms; renamed EN/DE canonical series terms
- [x] React static fallback updated in `coinarchive-contributor-app`

## In Progress
- [ ] Manual test coin_series submit/edit in WP admin taxonomy box

## Pending Tasks
- [ ] Configure `CAES_FRONTEND_URL` for production React app
- [ ] Configure `CAES_GEMINI_API_KEY` in wp-config.php for AI endpoint
- [ ] Manual validation of SMTP-delivered auth emails

## Last Update
2026-06-11 — coin_series renamed to comma-free terms; legacy aliases + React fallback updated
