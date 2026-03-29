# MyExpense India — Personal Budget Tracker

A lightweight, mobile-first expense tracking web app built on Google Apps Script. Designed specifically for Indian households with support for two users (couple/family), Indian currency formatting, and India-specific expense categories.

## Features

- **Manual Entry** — Log expenses and income with category, payment mode, and notes
- **Auto-Categorization** — Recognizes 40+ Indian merchants (Swiggy, Zomato, BigBasket, Ola, etc.)
- **Sankey Flow Chart** — D3.js-powered cash flow visualization (Income → Expenses → Savings)
- **Budget Management** — Set monthly budgets with auto pre-fill from previous month actuals
- **Pro Tips** — AI-generated personalized financial tips based on spending patterns
- **Multi-User** — Two users can log expenses to a shared Google Sheet
- **Indian Formatting** — Lakh/Crore number format, 50+ India-specific categories with emoji icons
- **Mobile-First** — Add to home screen for app-like experience on any phone

## Tech Stack

- **Backend:** Google Apps Script (Code.gs)
- **Frontend:** Single HTML file with vanilla JS, CSS (Index.html)
- **Visualization:** D3.js v7.8.5 + d3-sankey v0.12.3
- **Storage:** Google Sheets (auto-created on first run)
- **Config:** appsscript.json (Apps Script manifest)

## Quick Setup

1. Go to [script.google.com](https://script.google.com) and create a new project
2. Replace the default `Code.gs` with the `Code.gs` from this repo
3. Create a new HTML file named `Index` and paste the contents of `Index.html`
4. Click **Deploy → New deployment → Web app**
5. Set access to "Anyone with the link" and deploy
6. Open the deployment URL on your phone and add to home screen

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed step-by-step instructions.

## File Structure

```
Code.gs              — Backend: all server-side logic
Index.html           — Frontend: complete single-page web app
appsscript.json      — Apps Script project manifest
DEPLOYMENT_GUIDE.md  — Step-by-step deployment instructions
```

## Expense Categories (50+)

Groceries/Kirana, Online Food Delivery, Eating Out, Petrol/Diesel, Auto/Cab/Ola/Uber, Rent, Electricity Bill, Mobile Recharge, Medical/Pharmacy, EMI/Loan Payment, Online Shopping, School/Tuition Fees, Insurance Premium, Subscriptions (OTT/Apps), Investments/SIP, and many more.

## Auto-Categorization Keywords

| Keyword | Category |
|---------|----------|
| SWIGGY, ZOMATO, DUNZO | Online Food Delivery |
| BIGBASKET, BLINKIT, ZEPTO | Groceries/Kirana |
| OLA, UBER, RAPIDO | Auto/Cab/Ola/Uber |
| NETFLIX, HOTSTAR, SPOTIFY | Subscriptions (OTT/Apps) |
| AMAZON, FLIPKART | Online Shopping |
| SALARY, SAL CR | Salary (Income) |

## License

MIT
