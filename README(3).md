# 🍛 Bombay Bites — Café Ordering System

Zaika from the streets of Bombay, delivered to your desktop.

A desktop application for running a café: manage the menu, take table orders, and track them from pending to served. Built with **Electron.js** and **Supabase** (authentication, Postgres database, file storage).

## Features

- Landing page with Sign Up / Sign In
- Supabase email/password authentication with session persistence
- Protected dashboard: total orders, pending orders, menu items, today's revenue, recent orders
- **Menu management** (full CRUD): name, description, price, category, availability, photo upload
- **Orders** (full CRUD): create an order for a table, add items from a visual menu grid, live totals, status updates (pending → preparing → served → completed / cancelled), delete
- Every order is tied to the logged-in user; Row Level Security enforces this in the database
- Light / dark mode toggle in the navbar, saved between sessions
- Loading states and error messages on all major actions

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron.js |
| UI | HTML, CSS (CSS variables for theming), vanilla JavaScript |
| Backend | Supabase (Auth, Postgres, Storage, Row Level Security) |
| Client SDK | @supabase/supabase-js (loaded from CDN) |

## Project Structure

```
bombay-bites-cafe/
├── main.js              Electron main process
├── preload.js           Secure bridge to the renderer
├── package.json
├── database/
│   └── schema.sql       Full Supabase setup (tables, RLS, storage)
└── src/
    ├── index.html       Landing page
    ├── login.html
    ├── signup.html
    ├── dashboard.html
    ├── menu.html
    ├── orders.html
    ├── order-details.html
    ├── css/style.css
    └── js/              One script per page + theme and Supabase client
```

## Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/<your-username>/bombay-bites-cafe.git
   cd bombay-bites-cafe
   npm install
   ```
2. **Create a Supabase project**, then open **SQL Editor** and run `database/schema.sql`.
3. In Supabase go to **Authentication → Providers → Email** and turn **Confirm email** off (for local demo use).
4. Copy your **Project URL** and **anon public key** (Project Settings → API) into `src/js/supabaseClient.js`.
5. **Run the app**
   ```bash
   npm start
   ```

## Database

| Table | Purpose |
|---|---|
| `profiles` | Extends Supabase auth users (created automatically on sign up) |
| `categories` | Menu categories |
| `menu_items` | Menu with price, availability, image |
| `orders` | One row per table order, owned by a user |
| `order_items` | Items inside an order (name and price stored at order time) |

## Screenshots

Add screenshots of the landing page, dashboard, menu, orders, and order details here.
