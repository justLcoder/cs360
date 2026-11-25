# FlatSplit - CS360 Assignment 4

Small React prototype with five fixed roommates (A-E), plain CSS and localStorage. No backend or login.

## Run
Requires Node.js 18 or newer.

```sh
npm install
npm start
```
Open the URL printed in the terminal (normally http://localhost:5173).

## Check
```sh
npm test
npm run build
```

## Try it
- Initial purchase: milk for four, apples for five, rice for E. A bought everything. B is marked as paid in full (11,000 UZS).
- Add a product with quantity, unit, actual total price and participants.
- View split shows shares and product breakdowns. Mark each roommate as Paid or Unpaid after a transfer outside the app.
- History shows remaining amounts for the selected viewer. Viewing as demonstrates user perspectives without login.
- New purchase lets you select another buyer and date.

Quantity describes the purchase; the price is already the total spent. Costs are split equally among selected participants. Rounding uses tiyin and assigns any remainder in roommate order.

## Files
- src/main.jsx: React screens, forms and navigation
- src/style.css: responsive styles
- src/calculations.js: split calculations
- src/sampleData.js: sample purchases
- src/calculations.test.js: calculation checks

## Limitations
Data is saved only in this browser, not shared across devices. No bank integration, receipt upload, buyer approval, or debt netting. Editing and deleting saved entries are outside this iteration. Payment statuses are trusted. Adding a product resets the purchase payment statuses because the shares change. Older stored incomplete payments are treated as unpaid; fully covered payments stay paid. This is a UI prototype, not a real shared account system.

For submission include source and package files, excluding node_modules and dist. Add the completed UCD DOCX and photos of the original and revised sketches to the assignment archive separately.
