# Finder & Filter (Keyset Pagination Product Catalog)

A fast, real-time products catalog paginated with keyset cursors. It handles a database of **200,000 products** dynamically, preventing duplicate or skipped items even when concurrent updates are made to the database.

## Tech Stack
* **Backend:** Node.js, Express, MongoDB
* **Frontend:** Next.js (App Router, Vanilla CSS)

---

## Getting Started

### 1. Run the Backend
1. Go to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the seed script to populate 200,000 products:
   ```bash
   npm run seed
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 2. Run the Frontend
1. Go to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Keyset Pagination Verification

To test and verify pagination stability under concurrent inserts:
```bash
cd backend
node test.js
```
This automated script queries pages, inserts mock products in the background, and asserts that pagination remains completely consistent without duplicates or skips.