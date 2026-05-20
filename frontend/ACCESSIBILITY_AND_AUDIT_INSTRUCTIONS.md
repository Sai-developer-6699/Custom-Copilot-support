Accessibility & Reduced-Motion Checks

1) Quick setup
- Ensure frontend dev server is running (default `http://localhost:3000`):

```powershell
cd frontend
npm install
npm run dev
```

2) Lighthouse (headless)
- Requires Chrome installed. Run from project root or frontend folder:

```powershell
npx lighthouse http://localhost:3000 --output html --output-path=./lighthouse-report.html --only-categories=accessibility,best-practices,performance
```
- Open `lighthouse-report.html` and review accessibility score and failing audits.

3) axe-core CLI (automated accessibility checks)

```powershell
# install once globally or use npx
npm install -g @axe-core/cli
npx @axe-core/cli http://localhost:3000 --save ./axe-report.json
```

4) Reduced-motion manual QA
- In Chrome DevTools: Open `Rendering` panel → Emulate `prefers-reduced-motion: reduce` and confirm animations are reduced/disabled.
- Programmatic check: in console run `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.

5) Notes & remediation
- Prioritize issues flagged by Lighthouse/axe that affect keyboard navigation, color contrast, and ARIA roles.
- For motion-heavy components, ensure `useReducedMotion()` from `framer-motion` is used and falls back to static states.

6) Collect reports and paste them here for a guided remediation plan.
