# Halyard Learning Platform — Clickable Prototype Plan

A high-fidelity, **frontend-only** prototype of the learner experience. No real auth, database, SCORM runtime, or AI calls — everything runs on in-memory mock data so we can ship a polished, demo-able product fast. Enterprise architecture, SSO, SCORM, and AI are documented as Phase 2.

## Scope

**In scope (built):**
- Mocked login screen with role switcher (Learner, Manager, Admin previews — but only Learner is fully fleshed out)
- Learner dashboard, course catalog, learning paths, certifications, profile
- Course player with sidebar TOC, progress tracking, voice-narration UI affordance (audio player shell)
- Oncology Course — Module 1 ("Insights Into Cancer") built end-to-end with real interactions; Modules 2–6 scaffolded with locked/preview states
- Sterilization Course — listed in catalog, one lesson playable
- Assessment engine with 4 question types live (single, multi, true/false, drag-drop), scoring, pass/fail, retry
- Certificate generation screen (printable HTML, QR placeholder, learner/course/date/score)
- Gamification: points, badges earned, simple leaderboard
- AI Assistant **UI shell** with canned/scripted responses (no live LLM)
- Mobile responsive throughout

**Out of scope (Phase 2, documented only):**
- Real auth (Azure AD, Okta, Google SSO, MFA) — login is a mocked stub
- Real database / persistence — state lives in React + localStorage
- SCORM 1.2 / 2004 runtime + ZIP export
- Live AI / RAG
- Content authoring system (we'll wireframe one screen, not build it)
- Manager/Admin/Compliance dashboards (one wireframe each, not interactive)
- Analytics pipeline (Metabase etc.)

## Interactions built for Oncology Module 1

1. **Cancer Cell Explorer** — clickable diagram with hotspot reveals
2. **Normal vs Cancer Cell Comparison** — side-by-side slider/toggle
3. **Metastasis Animation** — CSS/Framer Motion stepped animation with play/pause
4. **Treatment Selection Scenario** — branching scenario with 2–3 decision points and feedback
5. **Knowledge Check** — inline mid-lesson quiz
6. **Click-to-Reveal cards** — flashcard-style interactions
7. **Drag-and-Drop** — match treatments to cancer types

These prove the LXP feel. Other modules will show their interaction *types* in the TOC with "Coming in Phase 2" overlays so the demo communicates breadth.

## Information architecture / routes

```
/                              Landing → redirects to /login
/login                         Mocked SSO buttons + email form
/dashboard                     Learner home
/catalog                       Browse all courses
/paths                         Learning paths (Oncology Specialist, Sterilization Cert)
/courses/$courseId             Course overview + enroll/continue
/courses/$courseId/play/$lessonId   Course player (lesson + interactions)
/courses/$courseId/assessment  Final assessment
/certificates                  My certifications list
/certificates/$certId          Printable certificate
/profile                       Progress, badges, points, leaderboard
/ai-assistant                  Chat shell with scripted responses
/admin (wireframe)             Static screenshot-style page
/authoring (wireframe)         Static screenshot-style page
```

## Design direction

Healthcare/clinical, but warm and modern — Duolingo-style energy filtered through Coursera/LinkedIn Learning polish. Halyard's brand leans medical-trust (deep teal/navy + clean whites + a vibrant accent for progress/streaks). I'll generate 3 design directions before building so you can pick the look.

## Tech (Lovable stack)

- TanStack Start + React + TypeScript + Tailwind v4
- Framer Motion for interactions/animations
- shadcn/ui for primitives
- Recharts for progress/analytics widgets
- All data from `src/lib/mock/*.ts` (typed mock fixtures)
- State via React Query (cache only) + localStorage for progress persistence across reloads
- No Lovable Cloud / Supabase enabled (prototype is offline)

## Build order

1. Design direction selection (3 prototypes → you pick one)
2. Design system, mock data fixtures, route shell
3. Login + dashboard + catalog + profile
4. Course overview + course player chrome (sidebar, progress, audio shell)
5. Oncology Module 1 interactions (the LXP centerpiece)
6. Assessment engine + certificate generation
7. Gamification surfaces + AI assistant shell
8. Admin/Authoring wireframe pages + polish pass

## Deliverable docs

Generated as downloadable artifacts in `/mnt/documents/` after the prototype is built, **only if you want them**:
- PRD, BRD, System Architecture, ERD (Mermaid), API spec outline, Sprint plan

Tell me to include the docs pack and I'll add it as a final step. Otherwise we ship just the clickable prototype.

## Open question before I start

The prototype will be most impressive if Oncology Module 1 has real, custom medical illustrations (cancer cell, metastasis, clean-room PPE). I'll generate these with the image tool. Confirm that's fine — otherwise I'll fall back to icon-based / abstract visuals.
