# Google Review QR Smart Flow

A React application with an authentic Google Reviews interface and smart sentiment routing.

---

## 🎯 What It Does

When a customer scans a table QR code or counter flyer:
1. **Google Review Experience:** Opens a screen styled to look like an authentic Google Review dialog (Google Maps / Google Business Profile).
2. **Smart Sentiment Routing:**
   - ⭐ **1 - 3 Stars (Low / Critical Review):**
     - Keeps the customer **inside the application**.
     - Prompts for private, actionable feedback (service speed, food/service quality, staff friendliness, cleanliness, etc.).
     - Allows customer to request management contact to resolve issues privately.
     - Logs the issue to the **Private Feedback Inbox** (does **NOT** get published on Google Maps).
   - ⭐ **4 - 5 Stars (High / Positive Review):**
     - Celebrates with confetti.
     - Automatically routes the customer directly to the business's official **Google Review Dialog** (`https://search.google.com/local/writereview?placeid=...`).
     - Includes a 1-click **"Copy Review to Clipboard"** button so users can paste any comments into Google Reviews.

---

## 🚀 Features

- **Pixel-Perfect Google Review Design:** Google Sans / Roboto typography, Google multi-color logo, interactive 5-star rating with hover descriptions, verified account badge, and public disclaimer banner.
- **Integrated QR Code Generator:** Generate printable QR codes linking directly to this web application. Download as high-resolution PNG for table tents or counter stands.
- **Private Feedback Inbox:**
  - In-app storage (`localStorage`) of all 1-3 star submissions with ticket numbers, timestamps, selected issue categories, comments, and customer contact info.
  - Export to CSV format for CRM / manager tracking.
- **Business Customization:**
  - Custom Business Name, Category, Address, Cover photo, and Avatar.
  - Custom Google Review Place ID URL.
  - Configurable auto-redirect delay.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Lucide Icons, qrcode.react, canvas-confetti
- **Backend:** Node.js Express REST API (`server/index.js`)
- **Database:** SQLite (`data/reviews.sqlite`) with native WAL mode (`node:sqlite`)
- **Proxy:** Vite dev server automatically proxies `/api` requests to the SQLite backend on port 3001

---

## 🗄️ SQLite Database Schema

The SQLite database file is stored at `data/reviews.sqlite`:

1. **`feedbacks` table**:
   - `id`, `ticket_id`, `rating`, `business_name`, `issues` (JSON), `feedback_text`, `customer_name`, `customer_contact`, `want_follow_up`, `status`, `created_at`
2. **`settings` table**:
   - Key-value store for business profiles (name, cover, avatar, Google Review link, redirect settings).
3. **`admins` table**:
   - Stores authorized management credentials (seeded with `info@veltron.in` / `password123`).
   - Passwords and sessions managed in SQLite.
4. **`auth_sessions` table**:
   - Active bearer session tokens with expiration.

---

## 🚀 API Endpoints

- `GET /api/settings` - Public: returns current business settings.
- `POST /api/settings` - Protected: updates business configuration (requires Super Admin token).
- `POST /api/feedbacks` - Public: intercepts customer 1-3 star review and saves to SQLite.
- `GET /api/feedbacks` - Protected: retrieves all private customer complaints from SQLite.
- `DELETE /api/feedbacks` - Protected: clears feedback records.
- `POST /api/auth/login` - Authenticates `info@veltron.in` / `password123`.
- `GET /api/auth/verify` - Verifies active session token.
- `POST /api/auth/logout` - Revokes session token.

---

## 🏃 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Run both SQLite backend & frontend together
```bash
npm run dev
```
- **Frontend:** `http://127.0.0.1:5173/`
- **SQLite Backend API:** `http://127.0.0.1:3001/`

### 3. Build for production
```bash
npm run build
```

---

## 🔐 Authorized Personnel & Super Admin Login

All backend data (customer complaints, contact info, ratings, business settings, and QR stands) is strictly restricted to authorized personnel.

### Super Admin Credentials:
- **Email:** `info@veltron.in`
- **Password:** `password123`
- **Role:** `Super Admin`

To access backend data:
1. Navigate directly to the login portal: **`https://reviewflow.veltron.in/login`** (or `http://127.0.0.1:5173/login`).
2. Enter the Super Admin credentials (or use the one-click **"Auto-fill Credentials"** helper).
3. Once authenticated:
   - View the **Private Feedback Inbox** (1–3 star intercepted complaints).
   - Export reports to **CSV**.
   - Configure the **Google Place Review URL** and business details.
   - Configure **Admin Username & Password**.
   - Generate and download the high-res **Table Stand QR Code**.
   - Click **"Log out"** anytime to lock the backend.

> **Note:** The public customer-facing page (`/`) is completely clean with no admin headers or buttons. All management tools are securely isolated to `/login`.

---

## ⚙️ How to Set Your Google Review URL

1. In the application, click **"QR Stand & Settings"** in the top bar.
2. Go to the **Google Review Link & Config** tab.
3. Paste your official Google Place ID review link:
   `https://search.google.com/local/writereview?placeid=<YOUR_PLACE_ID>`
4. Click **Save Changes**.
5. Go to the **QR Code & Stand** tab to download your custom QR code ready to print!
