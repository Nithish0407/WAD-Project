# Backend Testing Guide

## 1) Install dependencies

```powershell
npm install
```

## 2) Run migration and seed

```powershell
npm run migrate
npm run seed
```

## 3) Start server

```powershell
node app.js
```

Expected:
- `Server running on http://localhost:5000`
- `MySQL Connected`

## 4) Health and readiness

```powershell
curl -UseBasicParsing http://localhost:5000/health
curl -UseBasicParsing http://localhost:5000/ready
```

## 5) Automated API test

```powershell
npm test
```

## 6) Manual flow

1. Register faculty (`POST /api/auth/register`)
2. Login (`POST /api/auth/login`)
3. Get profile (`GET /api/auth/me`)
4. Assign own lab (`POST /api/labs/assign`)
5. Create equipment (`POST /api/equipment`)
6. Create reservation (`POST /api/reservations`)
7. Approve reservation (`PUT /api/reservations/:id/approve`)

All protected endpoints require:
- `Authorization: Bearer <token>`
