# Restaurant Management System

A staff-facing restaurant operations system: authentication, role-based access,
inventory, menu, tables, orders, a kitchen queue, billing and a dashboard.

**Stack:** Express 5 + TypeScript + MongoDB (Mongoose) · Next.js + shadcn/ui
**Course:** Web Development — Lab Final Project

## Team

| Name | GitHub | Email |
|---|---|---|
| Mostafijul Islam | [@hippopop](https://github.com/hippopop) | mostafijul1000@gmail.com |
| Iftekhar Rahat | [@rahat1212](https://github.com/rahat1212) | rahatiftekhar1015251@gmail.com |
| Rifah Zakia | [@rifahzakia](https://github.com/rifahzakia) | rifahzakia04@gmail.com |

## Features

1. **Authentication** — JWT access tokens (15 min) plus rotating refresh tokens in an httpOnly cookie.
2. **Role-based access** — four roles, defined in one editable file.
3. **Inventory** — ingredients with stock levels, restocking, and low-stock flags.
4. **Menu** — categories, search, sorting, price editing, and recipes linked to ingredients.
5. **Tables** — seat a party, assign a waiter, occupy and free tables.
6. **Orders** — taken against a table with the customer's name and phone; an account is created automatically for new numbers.
7. **Kitchen queue** — cooks see live tickets and mark items preparing → ready → served. Starting a dish consumes its ingredients.
8. **Billing** — generate a bill with tax and service charge, take payment, and the table is freed automatically.
9. **Dashboard** — today's revenue, popular dishes, table availability, active orders and low-stock count.
10. **User management** — admins and managers create staff accounts with a one-time temporary password.

## Roles

Access is defined entirely in [`backend/src/config/roles.ts`](backend/src/config/roles.ts).
Each role gets `none`, `read` or `write` on each resource — edit that table to change
what anyone can do.

| Resource | admin | manager | waiter | chef |
|---|---|---|---|---|
| users | write | write | — | — |
| menu | write | write | read | read |
| inventory | write | write | read | write |
| kitchen | write | write | read | write |
| tables | write | write | write | — |
| orders | write | write | write | read |
| bills | write | write | write | — |
| dashboard | read | read | read | — |

Restaurant details, tax and service-charge rates live in
[`backend/src/config/restaurant.ts`](backend/src/config/restaurant.ts).

## Getting started

**Prerequisites:** Node.js 20+, MongoDB, npm.

Start MongoDB (this script runs one on port 27018 with its own data directory,
so it will not touch any MongoDB you already use):

```bash
./scripts/mongo-dev.sh start
```

Backend — first terminal:

```bash
cd backend && cp .env.example .env && npm install && npm run seed:fresh && npm run dev
```

Frontend — second terminal:

```bash
cd frontend && cp .env.local.example .env.local && npm install && npm run dev
```

| | URL |
|---|---|
| API | http://localhost:5050/api/v1 |
| Frontend | http://localhost:3000 |

Seeded logins — all use the password `Password123!`:

| Role | Email |
|---|---|
| admin | admin@restaurant.local |
| manager | manager@restaurant.local |
| waiter | waiter@restaurant.local |
| chef | chef@restaurant.local |

## API

All routes are under `/api/v1`. Everything except login and refresh needs
`Authorization: Bearer <accessToken>`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Email + password. Returns an access token and sets the refresh cookie. |
| POST | `/auth/refresh` | Rotates the refresh cookie and returns a new access token. |
| POST | `/auth/logout` | Revokes the current refresh token. |
| GET | `/auth/me` | Current user and their access map. |
| PATCH | `/auth/password` | Change password; revokes all sessions. |

### Users
| Method | Path | Access |
|---|---|---|
| GET | `/users` | users: read |
| POST | `/users` | users: write — returns a one-time temporary password |
| PATCH | `/users/:id` | users: write |

### Inventory
| Method | Path | Access |
|---|---|---|
| GET | `/ingredients?search=&lowStock=true` | inventory: read |
| POST | `/ingredients` | inventory: write |
| PATCH | `/ingredients/:id` | inventory: write |
| POST | `/ingredients/:id/restock` | inventory: write |
| DELETE | `/ingredients/:id` | inventory: write |

### Menu
| Method | Path | Access |
|---|---|---|
| GET | `/categories` | menu: read |
| POST · PATCH · DELETE | `/categories[/:id]` | menu: write |
| GET | `/menu?search=&category=&sort=` | menu: read — `sort` is `name`, `price-asc`, `price-desc` or `newest` |
| POST · PATCH · DELETE | `/menu[/:id]` | menu: write |

Every menu item returned by `GET /menu` carries `canCook`, `maxPortions` and
`shortages`, computed from current ingredient stock.

### Tables and orders
| Method | Path | Access |
|---|---|---|
| GET | `/tables?status=&minSeats=` | tables: read |
| POST · PATCH | `/tables[/:id]` | tables: write |
| GET | `/orders?status=&table=` | orders: read |
| POST | `/orders` | orders: write — seats the table and creates the customer if new |
| GET | `/orders/:id` | orders: read |
| POST | `/orders/:id/items` | orders: write |
| PATCH | `/orders/:id/waiter` | orders: write |
| POST | `/orders/:id/cancel` | orders: write — frees the table |

### Kitchen
| Method | Path | Access |
|---|---|---|
| GET | `/kitchen/queue` | kitchen: read |
| PATCH | `/kitchen/orders/:orderId/items/:itemId` | kitchen: write — `preparing` consumes ingredients |
| POST | `/kitchen/cook` | kitchen: write — cook a dish outside an order |

### Billing and dashboard
| Method | Path | Access |
|---|---|---|
| POST | `/orders/:orderId/bill` | bills: write |
| GET | `/bills?status=` · `/bills/:id` | bills: read |
| POST | `/bills/:id/pay` | bills: write — marks paid and frees the table |
| GET | `/dashboard` | dashboard: read |

## How it fits together

An order is placed against a table with the customer's name and phone. If that
number has no account, one is created. Placing the order checks that every dish
can actually be made from current ingredient stock, marks the table occupied and
assigns a waiter.

The order appears on the kitchen queue. When a cook marks a line `preparing`, its
recipe is expanded and the ingredients are deducted from inventory — that is the
only place stock leaves the store room during service.

When the guests are done, the bill is generated from the order, tax and service
charge are added from the restaurant config, and paying it completes the order
and frees the table in one step.

## Project structure

```
backend/src/
  config/        env, database, roles, restaurant settings
  models/        User, RefreshToken, Category, Ingredient, MenuItem,
                 Table, Customer, Order, Bill, Counter
  middlewares/   authenticate, allow(resource, level), validate, error handler
  services/      token (JWT + rotation), kitchen (ingredient checks)
  controllers/   auth, user, inventory, menu, table, order, kitchen, bill, dashboard
  routes/        route definitions
  seeds/         demo data

frontend/src/
  lib/           axios client with token refresh, shared types, formatters
  providers/     auth (session + role access), react-query
  hooks/         one hook per resource
  components/    app shell with role-filtered navigation, shadcn/ui
  app/login/     sign-in
  app/(app)/     dashboard · orders · tables · kitchen · menu · inventory · bills · users
```

## Screens

| Route | What it does | Who sees it |
|---|---|---|
| `/login` | Sign in | everyone |
| `/dashboard` | Revenue, popular dishes, table availability, low stock, recent payments | all but chef |
| `/orders` | Open orders; `/orders/new` takes one | admin, manager, waiter (chef reads) |
| `/orders/[id]` | Add items, assign a waiter, generate the bill | admin, manager, waiter |
| `/tables` | Floor status and who is serving each table | admin, manager, waiter |
| `/kitchen` | Live tickets; start → ready → served | admin, manager, chef (waiter reads) |
| `/menu` | Browse, search, sort, filter; edit prices and recipes | all read; admin/manager write |
| `/inventory` | Ingredients, restocking, low-stock highlighting | all but waiter-write |
| `/bills` | Bill list; `/bills/[id]` is a printable receipt with payment | admin, manager, waiter |
| `/users` | Create staff, suspend accounts | admin, manager |

The sidebar only shows what a role may open — it is built from the same access
map the API enforces, returned by `GET /auth/me`.

### How the frontend holds a session

The access token lives in memory only, never in `localStorage`. On page load the
app calls `/auth/refresh` with the httpOnly cookie to recover it. If a request
comes back 401, one refresh is attempted and the request replayed — concurrent
401s share a single refresh so they cannot rotate each other's tokens.

## Environment variables

### `backend/.env`
| Variable | Example |
|---|---|
| `PORT` | `5050` |
| `MONGODB_URI` | `mongodb://127.0.0.1:27018/rms?replicaSet=rs0` |
| `JWT_ACCESS_SECRET` | long random string |
| `JWT_REFRESH_SECRET` | different long random string |
| `JWT_ACCESS_EXPIRES` | `15m` |
| `JWT_REFRESH_EXPIRES` | `7d` |
| `CLIENT_ORIGIN` | `http://localhost:3000` |
| `SEED_ADMIN_EMAIL` · `SEED_ADMIN_PASSWORD` | seeded admin credentials |

### `frontend/.env.local`
| Variable | Example |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5050/api/v1` |

## Conventions

Every response uses the same shape:

```jsonc
{ "success": true,  "message": "Menu fetched", "data": [] }
{ "success": false, "message": "Table \"T-03\" is already occupied", "code": "TABLE_OCCUPIED" }
```

`200` read/update · `201` create · `400` validation · `401` unauthenticated ·
`403` role not allowed · `404` missing · `409` conflict · `422` business rule.
