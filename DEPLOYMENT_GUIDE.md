# MyExpense India — Deployment Guide
## One-time setup (~10 minutes)

---

## STEP 1 — Create a new Google Apps Script project

1. Open your browser and go to: **https://script.google.com**
2. Click **"New project"** (top-left)
3. You'll see a default file called `Code.gs`

---

## STEP 2 — Paste the backend code

1. In the editor, you'll see `Code.gs` open on the left panel
2. **Select all** the existing code (Ctrl+A or Cmd+A) and **delete it**
3. Open the file `Code.gs` from your BudgetApp folder on your computer
4. Copy everything and **paste it** into the Apps Script editor
5. Click the **Save** icon (or Ctrl+S)

---

## STEP 3 — Add the frontend file

1. Click the **"+" icon** next to "Files" in the left panel → choose **"HTML"**
2. Name it exactly: `Index` (no `.html` extension — Apps Script adds it automatically)
3. **Select all** the placeholder code and **delete it**
4. Open `Index.html` from your BudgetApp folder
5. Copy everything and **paste it** into the new `Index.html` file in Apps Script
6. Click **Save**

---

## STEP 4 — Deploy as a Web App

1. Click **"Deploy"** button (top-right) → **"New deployment"**
2. Click the **gear icon** next to "Select type" → choose **"Web app"**
3. Set these options:
   - **Description:** MyExpense India v1
   - **Execute as:** Me (your Google account)
   - **Who has access:** Anyone  ← *(This lets your spouse access it too)*
4. Click **"Deploy"**
5. Google will ask you to **authorise** the app — click "Authorise access" → choose your Google account → click "Allow"
6. You'll see a **Web app URL** — copy it!

> **This URL is your app.** Bookmark it on your phone's home screen.

---

## STEP 5 — Add to phone home screen

### Android (Chrome):
1. Open the Web app URL in Chrome
2. Tap the **3-dot menu** (top right) → **"Add to Home screen"**
3. Name it "MyExpense" → tap **Add**

### iPhone (Safari):
1. Open the URL in Safari
2. Tap the **Share icon** (box with arrow) → **"Add to Home Screen"**
3. Name it "MyExpense" → tap **Add**

---

## STEP 6 — Share with your spouse (User 2)

1. **Share the same Web app URL** with your spouse via WhatsApp/SMS
2. They open it in their browser and bookmark/add to home screen
3. When logging, they select **"User 2"** in the Entered By field
4. Both users write to the **same Google Sheet** — fully synced!

> Optionally, also share the Google Sheet itself so both can view raw data:
> In Google Drive → find "MyExpense India — Data" → right-click → Share → enter spouse's Gmail

---

## HOW TO USE

### Logging expenses/income:
1. Open the app → you're on the **Log** tab
2. Tap **Expense** or **Income** toggle
3. Enter the amount
4. Type a description (auto-suggests category after 3 characters)
5. Pick a category chip (popular ones shown first, tap "+N more" for all)
6. Select payment mode (UPI/Cash/Card/NetBanking/Wallet)
7. Tap **Add Expense** (or Add Income)
8. Your entry appears in the list below

### Viewing the dashboard:
1. Tap the **Dashboard** tab
2. See: income, expenses, savings, savings rate cards
3. **Sankey cash flow chart** — money flowing from income → expenses → savings
4. **Flow Summary Table** — exact amounts and % of income
5. **Category Breakdown** — bar charts with budget comparison
6. Use the month pill (top-right) to switch months

### Setting a budget:
1. Tap the **Budget** tab
2. First month: enter limits for each category → tap **Save Budget**
3. Next month: the app pre-fills last month's actuals as a starting point
4. Adjust amounts and save

### Getting pro tips:
1. Tap the **Tips** tab for personalised analysis
2. The app flags overspent categories, savings rate, and gives India-specific advice

---

## TROUBLESHOOTING

| Problem | Fix |
|---------|-----|
| App shows "Init error" | Re-deploy: Deploy → Manage deployments → Edit → New version |
| Categories wrong | Tap a different category chip, or type description for auto-suggest |
| Two users see different data | Make sure both are using the EXACT same Web app URL |
| Want to update the app | Edit code in Apps Script → Deploy → Manage deployments → Edit → New version |

---

## YOUR APP FILES

| File | Purpose |
|------|---------|
| `Code.gs` | Server-side logic (paste into Apps Script) |
| `Index.html` | Full web app UI (add as HTML file in Apps Script) |
| `DEPLOYMENT_GUIDE.md` | This guide |

The Google Sheet (`MyExpense India — Data`) is auto-created on first launch in your Google Drive.
It has 4 tabs: Transactions, CategoryMap, Budget, Settings.

---

*Made for India · Manual entry with auto-categorisation · Sankey cash flow chart · Budget tracking · Pro tips*
