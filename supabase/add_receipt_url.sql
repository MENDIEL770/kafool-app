-- Store the payment receipt/invoice URL (e.g. Kesher's ezcount document link) on
-- each donation/order so the manager can view, download, and forward it to the
-- customer directly from the dashboard. Additive & nullable — safe to re-run.
ALTER TABLE donations ADD COLUMN IF NOT EXISTS receipt_url text;
