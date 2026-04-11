# Ops Console — Backend

Multi-Tenant Realtime Ops Console built with **Node.js + Express + Sequelize + PostgreSQL + Socket.io + Cloudinary**.

---

## Project Structure

```
backend/
├── config/
│   ├── config.js        # Sequelize CLI config (reads .env)
│   ├── database.js      # Sequelize instance
│   ├── jwt.js           # Sign / verify JWT tokens
│   ├── logger.js        # Winston logger
│   └── cloudinary.js            # AWS S3 client
│
├── controllers/
│   ├── authController.js        # Register, login, profile
│   ├── orgController.js         # Org CRUD, members, invites
│   ├── ticketController.js      # Ticket CRUD, status transitions, search
│   ├── commentController.js     # Comment CRUD
│   ├── attachmentController.js  # File upload / signed URL / delete
│   └── auditController.js       # Read audit logs
│
├── middlewares/
│   ├── auth.js           # JWT protect middleware
│   ├── orgAccess.js      # Role-based org membership check
│   ├── errorHandler.js   # Global error handler + createError helper
│   ├── rateLimiter.js    # API / auth / upload rate limits
│   └── upload.js         # Multer-cloudinary config
│
├── models/
│   ├── index.js          # Load all models + define associations
│   ├── User.js
│   ├── Organization.js
│   ├── OrgMember.js
│   ├── Invite.js
│   ├── Ticket.js
│   ├── Comment.js
│   ├── Attachment.js
│   └── AuditLog.js
│
├── routes/
│   ├── index.js           # Mounts all sub-routers
│   ├── authRoutes.js
│   ├── orgRoutes.js
│   ├── ticketRoutes.js
│   ├── commentRoutes.js
│   ├── attachmentRoutes.js
│   └── auditRoutes.js
│
├── services/
│   ├── auditService.js    # Helper to write audit log entries
│   └── emailService.js    # Nodemailer invite emails
│
├── sockets/
│   └── socketHandler.js   # Socket.io auth, rooms, presence, typing
│
├── migrations/
│   └── 20240101000000-create-all-tables.js
│
├── seeders/
│   └── 20240101000001-seed-demo-data.js   # Seeds 10,000 tickets
│
├── app.js          # Express factory (middleware, routes, error handler)
├── server.js       # HTTP server + Socket.io boot + graceful shutdown
├── .sequelizerc    # Points CLI to correct folders
└── .env.example    # Copy to .env and fill in values
```

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally (or connection string to a hosted DB)
- AWS S3 bucket (or MinIO for local S3)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your DB credentials, JWT secret, S3 keys, SMTP details
```

### 4. Run migrations (creates all tables)
```bash
npm run migrate
```

### 5. Seed the database (5 users + 2 orgs + 10,000 tickets)
```bash
npm run seed
```

### 6. Start the server
```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

Server starts at: `http://localhost:5000`

---

## API Overview

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login, get JWT |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/me | Update profile |

### Organizations
| Method | Path | Min Role |
|--------|------|----------|
| POST | /api/orgs | — (any user) |
| GET | /api/orgs | — (any user) |
| GET | /api/orgs/:orgId | viewer |
| PUT | /api/orgs/:orgId | admin |
| GET | /api/orgs/:orgId/members | viewer |
| PUT | /api/orgs/:orgId/members/:userId | admin |
| DELETE | /api/orgs/:orgId/members/:userId | admin |
| POST | /api/orgs/:orgId/invites | admin |
| POST | /api/orgs/invites/:token/accept | member (logged in) |

### Tickets
| Method | Path | Min Role |
|--------|------|----------|
| GET | /api/orgs/:orgId/tickets | viewer |
| POST | /api/orgs/:orgId/tickets | member |
| GET | /api/orgs/:orgId/tickets/:id | viewer |
| PUT | /api/orgs/:orgId/tickets/:id | member |
| PATCH | /api/orgs/:orgId/tickets/:id/status | member |
| DELETE | /api/orgs/:orgId/tickets/:id | admin |

**Query params for GET /tickets:**
- `search` — full-text search (PostgreSQL tsvector)
- `status` — open / investigating / mitigated / resolved
- `severity` — critical / high / medium / low
- `assignee_id` — UUID
- `tags` — comma-separated
- `date_from`, `date_to` — ISO date strings
- `cursor` — base64 pagination cursor
- `limit` — default 25, max 100

### Comments, Attachments, Audit Logs
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /api/orgs/:orgId/tickets/:ticketId/comments | List / add comments |
| PUT/DELETE | /api/orgs/:orgId/tickets/:ticketId/comments/:id | Edit / delete |
| POST | /api/orgs/:orgId/tickets/:ticketId/attachments | Upload files |
| GET | /api/orgs/:orgId/attachments/:id/url | Signed download URL |
| DELETE | /api/orgs/:orgId/attachments/:id | Delete file |
| GET | /api/orgs/:orgId/audit-logs | Paginated audit trail |

### Health
```
GET /health  →  { status: "ok", timestamp, uptime }
```

---

## WebSocket Events (Socket.io)

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join_org` | `{ orgId }` | Join org room (verified against membership) |
| `typing_start` | `{ ticketId }` | Broadcast typing indicator |
| `typing_stop` | `{ ticketId }` | Stop typing indicator |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `ticket:created` | `{ ticket }` | New ticket in org |
| `ticket:updated` | `{ ticket }` | Ticket fields changed |
| `ticket:status_changed` | `{ ticketId, oldStatus, newStatus }` | Status transition |
| `ticket:deleted` | `{ ticketId }` | Ticket removed |
| `comment:created` | `{ ticketId, comment }` | New comment |
| `comment:updated` | `{ ticketId, comment }` | Comment edited |
| `comment:deleted` | `{ ticketId, commentId }` | Comment removed |
| `attachment:uploaded` | `{ ticketId, attachments }` | Files uploaded |
| `presence_update` | `{ users }` | Active users in org |
| `user_typing` | `{ ticketId, user }` | Someone is typing |
| `user_stopped_typing` | `{ ticketId, userId }` | Stopped typing |

**Connect with auth:**
```js
const socket = io("http://localhost:5000", {
  auth: { token: "<JWT>" }
});
socket.emit("join_org", { orgId: "<org-uuid>" });
```

---

## Demo Credentials (after seeding)

| Email | Password | Role in Acme Corp |
|-------|----------|-------------------|
| alice@demo.com | Password123! | Owner |
| bob@demo.com | Password123! | Admin |
| carol@demo.com | Password123! | Member |
| dave@demo.com | Password123! | Viewer |
| eve@demo.com | Password123! | Member |

