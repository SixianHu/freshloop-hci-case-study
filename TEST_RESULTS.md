# Packaged-copy test results — 23 October 2026

Tests were run against a fresh copy of this repository, using existing offline dependencies where needed. No private Phase 4A application/configuration file was imported. Generated databases, config, TLS files and outputs stayed outside the release candidate.

| Check | Result |
|---|---|
| Landing, fictional account registration and login | PASS |
| Manual item creation and inventory filters | PASS |
| Edit quantity and restore food-details context | PASS |
| Shopping checklist, unknown date and purchase confirmation | PASS |
| Synthetic image upload and simulated receipt correction | PASS |
| Rule-based recipe suggestions from available ingredients | PASS |
| Mouse swipe, delete cancellation and confirmation | PASS |
| Refresh and reopen preserve signed-in data | PASS |

Chrome 155.0.8059.85; Node v24.19.0. Uncaught page errors: 0; external application requests attempted: 0.

Syntax/manifest checks passed separately. Clean dependency installation, production build, security audit, mobile/accessibility coverage and participant retests are NOT VERIFIED. Local browser/project/key state is not cross-device synchronization. [Testing instructions](TESTING.md) document exact portable commands and requirements.
