# HealthJobsPH API

Express.js backend API for HealthJobsPH Connect - a job matching platform for healthcare professionals in the Philippines.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js with TypeScript
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT validation (Supabase tokens)
- **Validation:** Zod schemas

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_JWT_SECRET` - JWT secret from Supabase settings

### 3. Run Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3001`

### 4. Verify Health

```bash
curl http://localhost:3001/api/health
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production server |
| `npm test` | Run tests |
| `npm run lint` | Lint source files |

## API Endpoints

### Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Full health check with DB status |
| GET | `/api/health/live` | Liveness probe |
| GET | `/api/health/ready` | Readiness probe |

### Profile (v1)

All profile endpoints require authentication (Bearer token).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile` | Get current user's profile |
| POST | `/api/v1/profile` | Create profile |
| PUT | `/api/v1/profile` | Update profile |
| DELETE | `/api/v1/profile` | Delete profile |
| GET | `/api/v1/profile/:userId` | Get profile by user ID |

## Project Structure

```
src/
├── index.ts              # Entry point
├── app.ts                # Express app setup
├── config/               # Configuration
│   ├── index.ts          # Config loader
│   └── cors.ts           # CORS settings
├── middleware/           # Express middleware
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── correlation.middleware.ts
│   ├── validation.middleware.ts
│   └── rate-limit.middleware.ts
├── routes/               # Route definitions
│   ├── index.ts
│   ├── health.routes.ts
│   └── v1/
│       ├── index.ts
│       └── profile.routes.ts
├── controllers/          # Request handlers
│   └── profile.controller.ts
├── services/             # Business logic
│   └── profile.service.ts
├── schemas/              # Zod validation
│   └── profile.schema.ts
├── lib/                  # Utilities
│   ├── supabase.ts
│   ├── errors.ts
│   └── supabase-errors.ts
└── types/                # TypeScript types
    └── express.d.ts
```

## Deployment

### Render.com

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Use the included `render.yaml` for configuration
4. Set environment variables in Render dashboard

## Security Features

- JWT validation using Supabase JWT secret
- Rate limiting (100 req/min general, 30 req/min mutations)
- CORS configuration with allowed origins
- Helmet security headers
- Request correlation IDs for tracing

## License

MIT
