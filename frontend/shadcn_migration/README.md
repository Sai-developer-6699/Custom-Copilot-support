shadcn/ui Migration Plan

Goal
- Incrementally migrate UI primitives to `shadcn/ui`, starting with `ResponseModal.jsx`, then `ChatSidebar.jsx`, then shared primitives in `frontend/src/components/ui/*`.

Phases
1. Prep (this step)
   - Create migration branch `ui/shadcn-migration/response-modal`.
   - Document mapping between current primitives and shadcn counterparts.
   - Add a small PR checklist and visual smoke-test instructions.

2. Migrate `ResponseModal.jsx` (small, self-contained)
   - Replace `Dialog`, `Card`, `Badge`, `Tabs` usages with shadcn equivalents.
   - Keep old components under a `legacy/` folder until tests pass.
   - Verify build and run `npm run build`.

3. Migrate `ChatSidebar.jsx`
   - Swap sidebar container and items; ensure streaming rendering remains intact.

4. Migrate primitives in `frontend/src/components/ui/*`
   - Replace implementation files one-by-one, updating imports across the codebase.

5. QA & Accessibility
   - Run frontend build and interactive manual testing.
   - Verify reduced-motion support and keyboard navigation.

File mapping (example)
- `frontend/src/components/ui/dialog.jsx` -> `shadcn` `Dialog`
- `frontend/src/components/ui/card.jsx` -> `shadcn` `Card`
- `frontend/src/components/ui/badge.jsx` -> `shadcn` `Badge`
- `frontend/src/components/ui/tabs.jsx` -> `shadcn` `Tabs`

Developer notes
- Prefer incremental small PRs; do not change more than one top-level component per PR.
- Keep old components until shadcn variants are verified.
- Use `pnpm` or `npm` to install shadcn init packages and follow the `npx shadcn@latest init` flow.

Smoke test checklist (for PR)
- [ ] `npm run build` succeeds
- [ ] `ResponseModal` opens and shows answer + sources
- [ ] Streaming still displays typing loader and partial chunks
- [ ] No console errors in browser

