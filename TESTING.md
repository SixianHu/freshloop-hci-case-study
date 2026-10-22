# Testing

## Syntax and manifest checks

With Node.js 22 or later:

```sh
node tests/syntax.cjs
```

This compiles JavaScript and inline browser scripts and compares manifest/lock declarations. It is not proof of functional behavior or dependency installation. TypeScript source uses the separate no-emit check below where applicable.

## Optional real browser regression

`tests/package.json` and its lockfile declare Playwright 1.62.1 separately from runtime dependencies. In an authorized environment, provision those dependencies (for example `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --prefix tests`). That installation was not run here. Use an already installed compatible Chrome through CHROME_EXECUTABLE; do not download a browser silently.

With the app running on its documented loopback port:

```sh
CHROME_EXECUTABLE="/path/to/installed/chrome" node tests/browser.cjs
```

Tests write results only under ignored `.local`. They create fictional browser/database records and require a disposable demo. Requests are restricted to documented loopback ports. Screenshots are optional with CAPTURE_SCREENSHOTS=true and remain generated private output. The TLS client, where used, explicitly trusts only the fresh generated local leaf/SPKI.

FreshLoop covers account entry, inventory/filter/add/edit, shopping/purchase, simulated receipt correction, rule-based recipes, swipe/delete cancellation/confirmation and refresh/new-tab persistence. No backend is needed.

## Result scope

See [test results](TEST_RESULTS.md) for the actual packaged-copy run. Clean dependency installation, production build, comprehensive security/accessibility/browser testing and human-participant retesting remain NOT VERIFIED. Test metadata is retained privately outside this source package.
