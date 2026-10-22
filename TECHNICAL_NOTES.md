# FreshLoop technical notes

`index.html` loads `style.css` and `script.js`. JavaScript renders workflow state into the DOM and maintains its own return-navigation context. Preparation-specific local/session storage holds fictional accounts and inventory, separately from the original coursework prototype. There is no backend or remote API.

Receipt input previews a local file and supplies fixed demonstration food items; it does not read image text. Recipe matching uses ingredient-name rules. Keep accounts/receipts fictional; browser storage is demonstration state rather than protected user storage.

The application HTML/CSS/JavaScript is preserved byte-for-byte from the tested Phase 4A copy. Packaging adds a restricted loopback static server and portable tests, without replacing interactions with screenshots or mock UI. `tests/browser.cjs` exercises actual mouse dragging plus pointer events; this is not a real touchscreen study.
