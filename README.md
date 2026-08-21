# StaySphere — Smart Hotel Management

A hotel management system built with **Laravel 12**, **MySQL**, and a premium single-page frontend (Bootstrap 5 + vanilla JavaScript + Chart.js) served straight from `public/app`.

## Features

- **Authentication** — Sanctum token auth (login / register / logout) with a protected SPA.
- **Dashboard** — KPI stats (rooms, occupancy, bookings, revenue) plus 4 Chart.js charts.
- **Rooms** — CRUD with image upload, status badges, search + pagination.
- **Guests** — CRUD with search + CSV export.
- **Bookings** — CRUD with auto booking code, auto total (nights × price), room-overlap prevention, and guest/room pickers.
- **Check-in / Check-out** — Today's arrivals & departures, in-house guests, status + room sync.
- **Payments** — CRUD tied to bookings; recalculates booking payment status.
- **Services** — CRUD with image upload and quick status toggle.
- **Availability** — Public room search by dates/guests/type with "Book now" prefill.
- **Reports** — KPIs, daily revenue, payment-method doughnut, most-booked rooms, popular types, JSON export.

## Tech Stack

- Backend: Laravel 12, Sanctum, API Resources, Form Requests, seeders.
- Frontend: hash-router SPA (`#/dashboard`, `#/rooms`, …), Axios, Chart.js, Bootstrap 5 + Font Awesome via CDN.
- Database: MySQL 8 (db `laravel_db`).

## Setup

1. **Install dependencies**
   ```
   composer install
   ```

2. **Environment**
   ```
   copy .env.example .env
   ```
   Set your DB credentials in `.env`:
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=laravel_db
   DB_USERNAME=root
   DB_PASSWORD=your_password
   ```

3. **App key, migrate, seed**
   ```
   php artisan key:generate
   php artisan migrate --seed
   php artisan storage:link
   ```

4. **Run**
   ```
   php artisan serve
   ```
   Open **http://127.0.0.1:8000** — you'll be redirected to the SPA at `/app`.

## Default Admin Login

```
Email:    admin@staysphere.com
Password: admin123
```

The seeder also creates 20 rooms, 15 guests, 21 bookings, 24 payments and 8 services.

## API Overview

Base URL: `/api/v1` — JSON envelope: `{ "success": bool, "message": string, "data": ... }`

| Endpoint | Auth | Description |
| --- | --- | --- |
| `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | login public | Auth |
| `GET /rooms`, `GET /rooms/{id}`, `POST /rooms`, `PUT /rooms/{id}`, `DELETE /rooms/{id}` | bearer | Rooms |
| `GET /guests`, `POST /guests`, … | bearer | Guests |
| `GET /bookings`, `POST /bookings`, … | bearer | Bookings |
| `POST /bookings/{id}/check-in`, `POST /bookings/{id}/check-out` | bearer | Check in/out |
| `GET /payments`, `POST /payments`, … | bearer | Payments |
| `GET /services`, `POST /services`, … | bearer | Services |
| `GET /availability?check_in=&check_out=&guests=&room_type=` | public | Room search |
| `GET /checkins-today` | bearer | Today's arrivals/departures |
| `GET /dashboard`, `GET /dashboard/charts` | bearer | Dashboard |
| `GET /reports?period=` | bearer | Reports |

> **Note on updates:** the SPA submits form edits as `POST` + `_method=PUT` (method spoofing) because the PHP built-in dev server does not parse `multipart/form-data` for `PUT` requests. This keeps file uploads working on both `php artisan serve` and production.
