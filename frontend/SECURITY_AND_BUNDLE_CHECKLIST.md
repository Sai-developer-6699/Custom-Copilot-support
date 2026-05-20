Security Audit & Bundle Verification Checklist

1) Frontend: npm audit

```powershell
cd frontend
npm install
npm audit --json > npm-audit.json
# quick fix
npm audit fix
```

- If `npm audit fix` can't resolve critical issues, run `npm audit` and inspect `npm-audit.json` to identify packages to upgrade. Use `npm outdated` to list available updates.
- Upgrade packages selectively and test the app after each major bump.

2) Backend: pip/pip-audit

```powershell
cd backend
python -m pip install pip-audit
pip-audit --format=json > pip-audit.json
```

- Review `pip-audit.json` for vulnerable packages and plan upgrades. Pin versions in `requirements.txt` and run tests.

3) Bundle-splitting verification (Vite configuration already set to manualChunks)

```powershell
cd frontend
npm run build
# Inspect generated chunks
ls build/assets
# Check file sizes
Get-ChildItem build\assets | Sort-Object Length -Descending | Select-Object Name,Length
```

- Look for `vendor.react.*.js`, `vendor.motion.*.js`, and other `vendor.*.js` files created by `manualChunks`.
- If large single bundles remain, consider splitting large libraries further or using dynamic imports for rarely used routes/components.

4) Source map and bundle analysis (optional)

```powershell
npm install --save-dev source-map-explorer
npx source-map-explorer build/assets/*.js
```

5) Suggested remediation workflow
- Triage vulnerabilities by severity and exploitability.
- For frontend: update minor/patch versions first, then test. For major upgrades, read changelogs.
- For backend: consider using virtual env with pinned deps and run `pytest` after upgrades.

6) Share `npm-audit.json`, `pip-audit.json`, and build `assets` list if you'd like automated remediation suggestions.
