# AgriSun inventory

Web frontend for the AgriSun Ethiopia inventory system: stock items, stock movements, suppliers and clients, and cost sheets.

Live app: https://agrisun-inventory.vercel.app

## What it does

- Sign in and sign up with email and password. Pages other than `/auth` redirect to the sign-in page when no user is logged in.
- Dashboard with total items, total inventory value, low-stock count, monthly revenue and sale count, plus charts of sales and transfers over time.
- Stock items (`/items`): create, edit and delete items with SKU, category, subcategory, unit of measure, cost price, unit price and low-stock threshold.
- Stock card per item (`/stock-card/:itemId`) showing every movement and the running balance, and a transfer stock card (`/transfer-card/:itemId`).
- Stock balance (`/stock-balance`): current quantity and value per item.
- Transactions (`/transactions`): record purchases, sales, adjustments and transfers with several line items, a reference number, supplier or client name, contact and TIN. Transactions can be exported to Excel, and each one can be downloaded as a PDF.
- Transaction detail page for viewing, editing and deleting a single transaction.
- Cost sheet (`/cost-sheet`): transactions grouped by base reference number with an expandable item ledger and PDF export per group.
- Excel import (`/import`): upload a workbook where each sheet is a product and its transaction history.
- Admin (`/admin`): manage users and roles (`admin`, `inventory_clerk`, `accountant`), categories and subcategories, and suppliers/clients. The user list is loaded only for admins.

The code has no separate customer records or installation tracking. Customers and clients appear as the counterparty on sale and transfer transactions, and as supplier records in the Admin page.

## Data

All data goes through a REST API in a separate repository, `agri-sun-backend` (Node.js, Express, MongoDB). The client is in `src/lib/api.ts`:

- The base URL comes from `VITE_API_URL` (default `http://localhost:5000/api`).
- Login returns a JWT, which is stored in `localStorage` under `agrisun_token` and sent as a `Bearer` token. A `401` response clears the token and sends the user to `/auth`.
- Endpoints used: `/auth`, `/users`, `/categories` (with subcategories), `/items` (including `/low-stock`, `/:id/stock-card` and `/import`), `/transactions`, `/dashboard`, `/stock-balance` (including `/recalculate`), `/activity-log` and `/suppliers`.
- `api.ts` converts MongoDB documents (`_id`, camelCase fields) to the `id` and snake_case fields the pages expect.

Leftovers from earlier versions are still in the repo and are not used by the running app:

- `supabase/` (config and SQL migrations) and `src/integrations/supabase/`. The app used Supabase before it moved to the Express/MongoDB API. `INVENTORY_DATA_README.md` describes one of those SQL migrations.
- `scripts/import-excel.js` (`npm run import`) still writes to Supabase.
- `server/routes/` and `server/migrations/` hold SQLite-style Express routes that import a `utils/initDb.js` file which does not exist in this repo.

## Tech stack

React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, shadcn/ui (Radix UI), Recharts, jsPDF and SheetJS (`xlsx`).

## Project structure

```
src/pages/             Route pages (Dashboard, Items, StockCard, TransferStockCard,
                       StockBalance, Transactions, TransactionDetail, CostSheet,
                       ImportPage, Admin, Auth)
src/lib/api.ts         REST client for the agri-sun-backend API
src/contexts/          AuthContext (JWT session and current user)
src/components/        Layout (navigation, auth redirect) and shadcn/ui components,
                       including the Excel uploader
public/                SPA fallback files (_redirects, .htaccess, 404.html)
supabase/, server/, scripts/   Legacy code, see above
```

## Run it locally

Start the `agri-sun-backend` API first (by default the frontend expects it at `http://localhost:5000/api`).

```sh
npm install
npm run dev        # Vite dev server on port 8080
```

Other scripts:

```sh
npm run build      # production build to dist/
npm run build:dev  # build in development mode
npm run preview    # serve the production build
npm run lint       # ESLint
```

## Environment variables

- `VITE_API_URL`: base URL of the agri-sun-backend API, including the `/api` path.

Legacy code only:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`: read by `src/integrations/supabase/client.ts`, which nothing imports.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: read by `scripts/import-excel.js`.

There is no `.env.example`.

## Deployment

`vercel.json` rewrites all paths to `index.html` for client-side routing on Vercel. `public/_redirects` and `public/.htaccess` do the same for Netlify-style and Apache hosting.
