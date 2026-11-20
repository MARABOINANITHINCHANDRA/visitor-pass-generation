# VisitEase – Digital Visitor Pass Generation and Tracking System

## Files
- `index.html` – all dashboard pages and forms
- `style.css` – responsive styling
- `app.js` – visitor registration, localStorage, approvals, check-in/out, QR pass generation, PDF, CSV and charts

## Run
1. Extract the ZIP.
2. Open the `visitease` folder in VS Code.
3. Install the VS Code extension **Live Server**.
4. Right-click `index.html` → **Open with Live Server**.
5. Use the sidebar to explore the demo.

The app loads sample visitor records on first run. Use **Reset demo data** in the sidebar to restore them.

## Important frontend-only limitations
- Data is saved only in the current browser using localStorage.
- Login/roles are represented by a demo admin interface; there is no secure authentication.
- Approvals and tracking are local simulations, not synchronized between devices.
- QR generation, PDF, charts and QR scanning load libraries from CDNs, so internet access is needed.
- Camera QR scanning generally requires localhost or HTTPS and browser camera permission.

## Test flow
1. Open **Approval requests** and approve a pending visitor.
2. Open **Live tracking** and check the visitor in.
3. Check the visitor out.
4. Open **Visitor history** and export the CSV.
5. Register a new visitor and open its generated digital pass.
