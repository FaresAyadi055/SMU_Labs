# FabLab Inventory Manager

A modern inventory management system for SMU, built with Nuxt 3, Vue 3, and PrimeVue.

## Overview

FabLab Inventory Manager is a full-stack application designed to help SMU efficiently manage their equipment and inventory. Users can browse available items, request equipment, track requests, and admins can manage inventory, handle requests, and monitor system logs.

## Features

- **User Authentication**: Secure login with JWT-based authentication
- **Inventory Management**: Browse and search equipment inventory
- **Request System**: Users can request items with tracking
- **Admin Dashboard**: Manage inventory, requests, and users
- **Logs & Monitoring**: Track system activities and changes
- **Missing Items Tracking**: Report and manage missing items
- **Purchase List**: Create and manage purchase orders
- **Real-time Notifications**: Toast notifications for actions

## Tech Stack

- **Frontend**: Vue 3, Nuxt 3, PrimeVue 4, Pinia
- **Styling**: Scoped CSS with PrimeIcons
- **Backend**: Nuxt Nitro
- **Authentication**: JWT (JSON Web Tokens) / magic-sdk
- **Package Manager**: pnpm

## Project Structure

```
├── app/
│   ├── components/        # Reusable Vue components
│   │   ├── Navbar.vue     # Navigation bar with cart & user menu
│   │   └── Footer.vue     # Application footer
│   └── pages/             # Nuxt auto-routed pages
│       ├── index.vue      # Root page (redirects to /home)
│       ├── login.vue      # Login page
│       ├── home.vue       # Home/inventory page
│       ├── cart.vue       # Request cart & management
│       ├── admin.vue      # Admin dashboard
│       ├── requests.vue   # Request tracking
│       ├── logs.vue       # System logs
│       └── purchase-list.vue # Purchase order management
│       └── Users.vue   # user management for admins 
│       └── Students.vue # student management for Instructors
│       └── Instructor.vue # request Cart validation for Instructors
├── stores/                # Pinia state management
│   └── auth.ts            # Authentication state & actions
├── utils/                 # Utility functions
│   └── exportCSV.ts       # to download data
├── middleware/            # Route middleware
│   └── auth.ts            # Authentication guard
├── server/
│   ├── api/               # Nuxt server routes (for API endpoints)
│   ├── db/                # Database utilities
│   └── services/          # Business logic services
├── public/                # Static assets
├── nuxt.config.ts         # Nuxt configuration
└── package.json           # Dependencies
```

## Installation & Setup

### Prerequisites
- Node.js 20.19.0 or later
- pnpm (recommended) or npm

### Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### Environment Configuration

Create a `.env` file in the project root:

```env
# API Configuration
VITE_API_URL=http://localhost:4000/api

# Database Configuration
MONGO_URI=mongodb+srv:.....

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# magic sdk API key
MAGIC_PUBLISHABLE_KEY=...
MAGIC_SECRET_KEY=....

# Vite Configuration 
VITE_APP_NAME=FabLab Inventory
VITE_DEBUG_MODE=false
NODE_ENV=production
VITE_MAGIC_ENABLED=true


# Server Configuration
PORT=4000
NODE_ENV=development
```

## Development

### Start Development Server

```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## API Integration

The application communicates with a Nuxt 3 / Nitro backend. The API base URL is configured via `API_URL` (Nuxt runtime config, exposed as `public.API_URL`).  
If unset, the frontend falls back to calling Nuxt server routes under `/api/...`.

All protected endpoints expect a `Bearer <JWT>` token in the `Authorization` header.

---

## API Reference

Below is a concise reference of the main API endpoints and their request/response structures.

### Authentication

#### `POST /api/auth/login`
**Body**
```json
{ "email": "user@medtech.tn" }
```

**Response**
```json
{
  "success": true,
  "message": "User verified",
  "data": {
    "email": "user@medtech.tn",
    "role": "student"
  }
}
```

> The client then obtains a JWT (via Magic link verification) which is used as `Authorization: Bearer <token>` for protected endpoints.

---

### Inventory

#### `GET /api/inventory`
Returns a paginated list of components.

**Query params (optional)**
- `search`: text search on `model` and `description`
- `location`: filter by location (string or number)
- `minQuantity`, `maxQuantity`: numeric quantity range
- `sortBy`: e.g. `model`, `quantity`
- `sortOrder`: `asc` | `desc`
- `page`, `limit`

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "648f...",
      "model": "2.4 tft lcd shield",
      "description": "arduino lcd shield",
      "quantity": 1,
      "location": 2, # for all roles except "student"
      "link": "https://...",
      "createdAt": "2026-02-27T13:40:21.355Z",
      "updatedAt": "2026-02-27T13:40:21.355Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 400,
    "total": 1,
    "pages": 1
  },
  "user": {
    "role": "admin",
    "email": "admin@medtech.tn"
  }
}
```

#### `POST /api/inventory`
Create a new component (admin only, logged).

**Body**
```json
{
  "model": "2.4 tft lcd shield",
  "description": "arduino lcd shield",
  "quantity": 10,
  "location": 2,
  "link": "https://...",
  "reason": "Initial stock"
}
```

**Response**
```json
{
  "success": true,
  "message": "Component created successfully",
  "data": {
    "component": { /* component document */ },
    "logId": "64af..."
  }
}
```

#### `PUT /api/inventory/:id`
Update component fields (admin only, logged).

**Body (any subset)**
```json
{
  "model": "New name",
  "description": "Updated description",
  "quantity": 5,
  "location": 3,
  "link": "https://...",
  "reason": "Stock correction"
}
```

**Response**
```json
{
  "success": true,
  "message": "Component updated successfully",
  "data": {
    "component": { /* updated component */ },
    "changes": [ /* field-level changes */ ],
    "logId": "64b0..."
  }
}
```

---

### Requests (Student-side)

#### `POST /api/requests`
Create a new request for a component.

**Body**
```json
{
  "model_id": "648f...",          // Component _id
  "student_email": "user@medtech.tn",
  "class_name": "Junior RE G2",
  "quantity": 2
}
```

**Response**
```json
{
  "success": true,
  "message": "Request created successfully",
  "data": {
    "id": "65e0...",
    "component": {
      "id": "648f...",
      "model": "2.4 tft lcd shield",
      "description": "arduino lcd shield",
      "link": "https://...",
      "availableQuantity": 1
    },
    "quantity": 2,
    "class": "Junior RE G2",
    "status": "pending",
    "createdAt": "2026-03-01T...",
    "user": {
      "email": "user@medtech.tn",
      "id": "647a..."
    }
  }
}
```

#### `GET /api/requests/:email`
Return all requests for the given email (must match authenticated user).

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "65e0...",
      "requested_quantity": 2,
      "class": "Junior RE G2",
      "status": "pending",
      "timestamp": "2026-03-01T...",
      "model": "2.4 tft lcd shield",
      "description": "arduino lcd shield",
      "link": "https://...",
      "current_quantity": 1
    }
  ],
  "meta": {
    "user": { "email": "user@medtech.tn", "id": "647a..." },
    "total": 1
  }
}
```

---

### Technician Approval & Cart Processing

#### `GET /api/admin/pending-users`
Returns users with at least one **pending** request, plus their pending and declined requests.

**Response (data item)**
```json
{
  "id": "647a...",
  "email": "student@medtech.tn",
  "role": "student",
  "oldestPendingAt": "2026-03-01T12:00:00.000Z",
  "totalPending": 2,
  "requests": [
    {
      "id": "65e0...",
      "component": {
        "id": "648f...",
        "model": "2.4 tft lcd shield",
        "description": "arduino lcd shield",
        "link": "https://...",
        "quantityInStock": 1,
        "location": 2
      },
      "quantityRequested": 2,
      "class": "Junior RE G2",
      "status": "pending",
      "createdAt": "2026-03-01T12:00:00.000Z"
    },
    {
      "id": "65e1...",
      "component": { /* same shape */ },
      "quantityRequested": 1,
      "class": "Junior RE G2",
      "status": "declined",
      "createdAt": "2026-03-01T13:00:00.000Z"
    }
  ]
}
```

#### `POST /api/admin/process-cart`
Processes a batch of decisions for a user’s cart using a single MongoDB transaction.

**Body**
```json
{
  "items": [
    { "requestId": "65e0...", "approvedQuantity": 2, "decision": "approve" },
    { "requestId": "65e1...", "approvedQuantity": 0, "decision": "decline" }
  ]
}
```

**Atomic effects (per item)**
1. Update `Request.status` to `approved` or `declined`.
2. For `approve`: decrement `Component.quantity` by `approvedQuantity`.
3. Write a `Log` entry (`REQUEST_APPROVE` or `REQUEST_DECLINE`) with quantity delta.

**Response**
```json
{
  "success": true,
  "message": "Cart processed successfully",
  "data": [
    {
      "requestId": "65e0...",
      "status": "approved",
      "approvedQuantity": 2,
      "remainingStock":  -1
    },
    {
      "requestId": "65e1...",
      "status": "declined",
      "approvedQuantity": 0
    }
  ]
}
```

---

### Returns Management

#### `GET /api/admin/active-loans`
Returns approved requests that have **not** been returned yet.

**Response (data item)**
```json
{
  "id": "65e0...",
  "user": {
    "id": "647a...",
    "email": "student@medtech.tn",
    "role": "student"
  },
  "component": {
    "id": "648f...",
    "model": "2.4 tft lcd shield",
    "description": "arduino lcd shield",
    "link": "https://...",
    "currentStock": 1
  },
  "quantityBorrowed": 2,
  "class": "Junior RE G2",
  "status": "approved",
  "borrowedAt": "2026-03-01T12:00:00.000Z"
}
```

#### `POST /api/admin/return-item`
Marks an approved request as returned in a transaction.

**Body**
```json
{ "requestId": "65e0..." }
```

**Atomic effects**
1. Set `Request.status` to `"returned"`.
2. Increment `Component.quantity` by `Request.quantity_requested`.
3. Write `REQUEST_RETURN` log with quantity delta.

**Response**
```json
{
  "success": true,
  "message": "Item marked as returned",
  "data": {
    "requestId": "65e0...",
    "componentId": "648f...",
    "status": "returned",
    "newStock": 3
  }
}
```

---

### Analytics & Inventory Planning

#### `GET /api/admin/purchase-list`
Computes deficits per component:
\( \text{Missing} = \text{Total Pending Requests} - \text{Current Stock} \).  
Only items where `Missing > 0` are returned, sorted by highest deficit.

**Response (data item)**
```json
{
  "componentId": "648f...",
  "model": "2.4 tft lcd shield",
  "description": "arduino lcd shield",
  "location": 2,
  "link": "https://...",
  "inStock": 1,
  "totalRequested": 5,
  "suggestedPurchaseQuantity": 4
}
```

---

### System Logs

#### `GET /api/admin/logs`
Paginated access to the `Logs` collection.

**Query params**
- `page`, `limit`
- `action` (optional; one of `INVENTORY_UPDATE`, `REQUEST_APPROVE`, `REQUEST_RETURN`, `USER_UPDATE`, etc.)
- `userEmail` (optional)

**Response (simplified)**
```json
{
  "success": true,
  "data": [
    {
      "id": "64b0...",
      "action": "REQUEST_APPROVE",
      "userEmail": "tech@medtech.tn",
      "userRole": "instructor",
      "timestamp": "2026-03-01T12:00:00.000Z",
      "metadata": {
        "entityId": "65e0...",
        "entityType": "request",
        "itemId": "648f...",
        "itemModel": "2.4 tft lcd shield",
        "requestStatus": "approved",
        "quantity": { "previous": 3, "new": 1, "change": -2 }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

---

### User & Role Management

#### `GET /api/admin/users`
List users (admin/superadmin only), with optional role filter.

**Query params**
- `role` (optional): `superadmin` | `admin` | `instructor` | `student`

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "647a...",
      "email": "user@medtech.tn",
      "role": "student",
      "createdAt": "2026-02-27T13:40:21.355Z",
      "updatedAt": "2026-02-27T13:40:21.355Z"
    }
  ]
}
```

#### `PUT /api/admin/users/:id`
Update a user’s role (superadmin only, logged).

**Body**
```json
{ "role": "admin" }
```

**Response**
```json
{
  "success": true,
  "message": "User updated",
  "data": {
    "id": "647a...",
    "email": "user@medtech.tn",
    "role": "admin"
  }
}
```

## State Management

Authentication state is managed using Pinia. The `useAuthStore` provides:
- User authentication status
- User profile information
- Login/logout functionality
- Admin role verification

```typescript
const authStore = useAuthStore()
authStore.isAuthenticated // Check if user is logged in
authStore.isAdmin         // Check if user is admin
authStore.logout()        // Logout user
```

## Components

### Navbar
- Displays application branding
- Shows user profile with avatar
- Admin-only navigation links
- Shopping cart with notification badge
- Logout functionality

### Footer
- Copyright information
- Contact links

## Route Protection

Routes are protected using Nuxt route middleware. Routes marked with `requiresAuth: true` will redirect unauthenticated users to the login page.

## Customization

You can now customize:
- Component styling and layout
- Page functionality and features
- API endpoints and requests
- Authentication flow
- Database schema and services

## Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run generate  # Generate static pages (if SSG is enabled)
```

## Notes

- The application is configured for Client-Side Rendering (CSR) by default
- API routes can be implemented in the `server/api/` directory
- Database services are located in `server/services/`
- Authentication middleware is applied to protected routes automatically

## Further Reading

- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [Vue 3 Guide](https://vuejs.org/guide/introduction.html)
- [PrimeVue Documentation](https://primevue.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)

## License

ISC
