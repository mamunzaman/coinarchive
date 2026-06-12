# Coin Archive SaaS Data Entry Vision

## Goal

Transform the contributor wizard from a traditional long form into a modern SaaS-style catalogue management experience (Notion / Linear / Shopify Admin / Sanity / Airtable / Strapi).

**Success criteria:** Faster, clearer, more professional — contributors and admins feel they are managing catalogue records, not filling a WordPress form.

---

## Current Baseline (Already Built)

| Area | Status | Key files |
|------|--------|-----------|
| 3-column wizard shell | Partial | `CoinEntryWizard.tsx`, `CoinEntryWizardLayout.tsx` |
| Left step navigation | Done (desktop xl) | Sidebar stepper in wizard |
| Horizontal step tabs | Done (tablet) | Sticky pill nav `< xl` |
| Right preview column | Partial | `CoinCataloguePreviewCard`, `SubmissionWorkflowPanel` (xl only) |
| Completion % | Done | `computeCompletenessScore`, `SubmissionWorkflowPanel` |
| Image quality checklist | Done | `imageQualityChecklist.ts` |
| Live coin ID preview | Done | `CoinCodePreview.tsx` |
| Duplicate detection | Done (non-blocking) | `useDuplicateSubmissionCheck`, `DuplicateWarningCard` |
| Draft autosave | Partial | `useFormDraftAutosave` — localStorage, 10s interval |
| Activity timeline | Partial | Detail page + WP `activity_logs` when available |
| Admin review UI | Partial | Detail, revision comparison, revision notes |
| Tablet/mobile UX | Recent pass | Sticky tabs, footer actions, crop modal, gallery touch |

**Gap:** Features exist but are scattered — not unified into a single SaaS productivity shell.

---

# Phase 1 — Quick Wins (MVP Polish)

Target: One coherent workspace layout + always-visible status + section health + compact image workspace.

## 1.1 Sticky Productivity Layout

**Target layout**

```
┌──────────────┬─────────────────────────┬──────────────┐
│ Left         │ Center                  │ Right        │
│ Nav + %      │ Active section          │ Coin summary │
└──────────────┴─────────────────────────┴──────────────┘
```

| Task | Priority | Files | Notes |
|------|----------|-------|-------|
| Unify 3-column grid at `lg` (not only `xl`) | P0 | `CoinEntryWizard.tsx` | Right panel currently `xl` sticky; extend to `lg` with collapsible right on md |
| Left nav: progress % + bar under step list | P0 | `CoinEntryWizard.tsx`, `SubmissionWorkflowPanel.tsx` | Extract readiness bar into left aside |
| Right panel: always show summary stack | P0 | `CoinCataloguePreviewCard.tsx` | Coin ID, country, year, type, status |
| Mobile/tablet: right panel → drawer or bottom sheet | P1 | New `WizardSummaryDrawer.tsx` | Avoid losing summary on `< lg` |

## 1.2 Smart Status Bar

**Target:** `Draft Saved • 92% Complete • No Duplicates Found • Pending Review`

| Task | Priority | Files | Notes |
|------|----------|-------|-------|
| New `WizardStatusBar` below header | P0 | New component + `CoinEntryWizard.tsx` | Single line, truncates gracefully on mobile |
| Wire draft state | P0 | `NewCoinPage.tsx`, `EditSubmissionPage.tsx` | `lastSavedAt`, save error from `useFormDraftAutosave` |
| Wire completion % | P0 | `computeCompletenessScore` | Same source as workflow panel |
| Wire duplicate state | P0 | `useDuplicateSubmissionCheck` | `No duplicates` / `Possible duplicate` |
| Wire submission status (edit) | P1 | `EditSubmissionPage.tsx` | `pending`, `needs_revision`, etc. |

## 1.3 Better Image Workspace

**Target:** `Obverse ✓` `Reverse ✓` `Gallery (6)` — compact, always visible in right panel or status area.

| Task | Priority | Files | Notes |
|------|----------|-------|-------|
| New `ImageWorkspaceSummary` component | P0 | New + wire in right panel | Uses existing preview URLs + counts |
| Show check/warn per face | P0 | Reuse `imageQualityChecklist` pass/warn | No new API |
| Gallery count (existing + pending − removed) | P0 | Edit page gallery state props | Already tracked in pages |

## 1.4 Section Completion Indicators

**Target:** `✓ Core Identity` `⚠ Mint Information` `○ Descriptions`

| Task | Priority | Files | Notes |
|------|----------|-------|-------|
| `getStepCompletionStatus(stepId, values, images)` | P0 | New `lib/stepCompletion.ts` | Returns `complete` \| `attention` \| `empty` |
| StepButton + pill tabs show status icon | P0 | `CoinEntryWizard.tsx` | Pass status from pages |
| Rules: required fields → attention if invalid/incomplete | P0 | Align with `validateNewCoinForm` + image rules | Mint variants, admin step admin-only |

**Phase 1 exit:** Contributor opens wizard and immediately sees where they are, what's done, and what's missing — without scrolling.

---

# Phase 2 — Live & Intelligent Workspace

## 2.1 Live Coin Preview (enhanced)

| Task | Priority | Notes |
|------|----------|-------|
| Right panel updates on every field change | P0 | Already mostly live; ensure all taxonomy + images reflect instantly |
| Show submission status badge | P1 | Edit mode |
| Preview card on tablet via drawer | P1 | Phase 1 drawer |

## 2.2 Autosave Draft (SaaS-style)

| Task | Priority | Notes |
|------|----------|-------|
| Save on section change | P0 | Hook `onStepChange` in pages |
| Save on blur / debounced field change | P1 | 2–3s debounce optional |
| Visible "Saving…" / "Saved" in status bar | P0 | Phase 1 status bar |
| Server draft sync (if API supports) | P2 | Today: localStorage + manual Save draft |

## 2.3 Duplicate Detection Panel

| Task | Priority | Notes |
|------|----------|-------|
| Move `DuplicateWarningCard` into right sidebar | P0 | Replace inline alert on form steps |
| List match title + link to submission | P1 | `DuplicateMatch` type already exists |
| Status bar summary line | P0 | Phase 1 |

## 2.4 Activity Feed (wizard context)

| Task | Priority | Notes |
|------|----------|-------|
| Compact feed in right panel (edit mode) | P1 | Reuse detail timeline component |
| Events: created, edited, image replaced, gallery, status | P1 | WP `activity_logs` + static fallback |

**Phase 2 exit:** Zero-save anxiety — user sees live catalogue record, autosave feedback, duplicates, and history in one place.

---

# Phase 3 — Admin & Scale

## 3.1 Admin Review Workspace

| Task | Priority | Notes |
|------|----------|-------|
| Split view: submission left, review right | P1 | Extend `SubmissionDetailPage` or new `/admin/review/:id` |
| Inline notes + approval actions | P1 | Revision notes UI exists — consolidate |
| Compare revision diff panel | P2 | `SubmissionRevisionComparison` exists |

## 3.2 Bulk Editing

| Task | Priority | Notes |
|------|----------|-------|
| Multi-select on My Submissions table | P2 | New bulk action bar |
| Bulk status / featured / app enabled | P2 | Needs WP batch REST endpoints |
| Bulk category assign | P3 | Taxonomy batch API |

**Phase 3 exit:** Admin workflow feels like a review desk, not wp-admin.

---

# Implementation Order (Recommended)

1. `lib/stepCompletion.ts` — section status logic (unblocks nav + status bar)
2. `WizardStatusBar` — draft / % / duplicate / status line
3. `ImageWorkspaceSummary` — obverse / reverse / gallery compact row
4. Refactor `CoinEntryWizard` grid — left progress, right summary at `lg+`
5. Step nav status icons (sidebar + pills)
6. Phase 2 autosave triggers + sidebar duplicate panel
7. Phase 3 admin split view (separate milestone)

---

# Out of Scope (Keep Stable)

- WordPress ACF field keys and REST payload shape
- Crop/upload/gallery API contracts
- Taxonomy whitelist validation rules
- Review step submit flow

---

# Key Files Reference

| Component | Path |
|-----------|------|
| Wizard shell | `src/components/coin/CoinEntryWizard.tsx` |
| Form sections | `src/components/coin/CoinFormFields.tsx` |
| Workflow / readiness | `src/components/coin/SubmissionWorkflowPanel.tsx` |
| Catalogue preview | `src/components/coin/CoinCataloguePreviewCard.tsx` |
| Duplicate check | `src/hooks/useDuplicateSubmissionCheck.ts` |
| Draft autosave | `src/hooks/useFormDraftAutosave.ts` |
| Completeness | `src/lib/completenessScore.ts` |
| Steps config | `src/types/coinFormSteps.ts` |
| New coin page | `src/pages/NewCoinPage.tsx` |
| Edit page | `src/pages/EditSubmissionPage.tsx` |

---

# Manual Test Checklist (Phase 1)

- [ ] Status bar visible on new + edit wizard at all breakpoints
- [ ] Completion % matches workflow panel score
- [ ] Section icons match actual field state
- [ ] Image workspace shows correct ✓/✗ and gallery count
- [ ] Right summary visible at `lg+`; accessible on tablet
- [ ] No regression to submit, crop, or gallery remove

---

*Last updated: 2026-06-07*
