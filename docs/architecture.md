# Architecture Documentation

**Project:** wplacer  
**Version:** 5.6.2  
**Last Updated:** April 19, 2026

---

## Overview

wplacer is a distributed auto-drawing bot for wplace.live consisting of three main components:

1. **Backend Server** - Node.js/Express API server with WebSocket support
2. **Frontend** - React-based web UI for management
3. **Browser Extension** - Chrome extension for browser automation and CAPTCHA handling

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Extension                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Content      │  │ Background   │  │ Popup        │           │
│  │ Script       │  │ Script       │  │ UI           │           │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘           │
│         │                  │                                    │
│         └──────────────────┴──────────────┐                     │
│                    WebSocket/HTTP       │                       │
└──────────────────────────────────────────┼──────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Server (Express)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ API Routes   │  │ WebSocket    │  │ Services     │           │
│  │              │  │ Server       │  │              │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Service Layer (Dependency Injection)        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │   │
│  │  │ WPlacer  │ │ Token    │ │ Template │ │ Charge   │     │   │
│  │  │ Client   │ │ Manager  │ │ Manager  │ │ Cache    │     │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Manage       │  │ Manage       │  │ Settings     │           │
│  │ Users        │  │ Templates    │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Directory Structure

```
src/
├── server.ts                 # Main entry point, server setup
├── config/
│   ├── constants.ts          # Configuration constants
│   └── settings.ts           # Settings management
├── middleware/
│   └── validation.ts         # Request validation with Zod
├── routes/
│   ├── templates.ts          # Template CRUD and share codes
│   ├── users.ts              # User management and status checks
│   └── settings.ts           # Settings endpoints
├── services/
│   ├── wplacer-client.ts     # WPlace API client
│   ├── token-manager.ts      # Token queue and validation
│   ├── template-manager.ts   # Template execution logic
│   ├── charge-cache.ts       # Charge prediction cache
│   ├── tile-manager.ts       # Tile data management
│   └── http-client.ts        # HTTP client wrapper
├── utils/
│   ├── logger.ts             # Winston logger
│   └── helpers.ts            # Utility functions
└── __tests__/
    └── validation.test.ts    # Validation tests
```

### Core Services

#### WPlacer Client (`wplacer-client.ts`)
- Handles all WPlace API interactions
- Manages painting, purchasing, and user info operations
- Uses dependency injection for HTTP client
- Integrates with TileManager and ChargeCache

#### Token Manager (`token-manager.ts`)
- Thread-safe token queue with locking mechanism
- Token validation and expiration checking
- Promise cleanup with timeout protection
- Queue size limits and expired token purging

#### Template Manager (`template-manager.ts`)
- Executes template drawing logic
- Uses dependency injection context
- Multi-user coordination with priority queue
- Cancellable operations for responsive settings updates

#### Charge Cache (`charge-cache.ts`)
- Predicts user charge availability
- Reduces API calls through caching
- Tracks charge regeneration timing

#### Tile Manager (`tile-manager.ts`)
- Manages tile data retrieval
- Caches tile information
- Handles tile coordinate calculations

### Server State Management

The server uses a structured `serverState` object instead of scattered global variables:

```typescript
const serverState = {
  templates: Map<string, Template>,
  users: Map<string, User>,
  settings: Settings,
  templateManager: TemplateManager,
  // ... other state
}
```

This provides:
- Better type safety
- Easier state persistence
- Cleaner shutdown procedures
- Reduced implicit dependencies

### Graceful Shutdown

The server implements proper graceful shutdown:

1. SIGTERM/SIGINT handlers
2. WebSocket connection closure with timeout
3. Interval cleanup
4. State persistence before exit
5. HTTP server closure with timeout protection

---

## Frontend Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── App.tsx               # Main application component
│   ├── index.css             # Global styles
│   ├── components/
│   │   ├── ManageUsers.tsx   # User management UI
│   │   ├── ManageTemplates.tsx # Template management UI
│   │   └── Settings.tsx      # Settings configuration UI
│   ├── assets/               # Static assets
│   └── hooks/                # Custom React hooks
└── public/
    └── icons/                # Icon assets
```

### Component Architecture

#### ManageUsers
- User CRUD operations
- Cookie input with password masking
- Parallel status checks
- Proxy configuration

#### ManageTemplates
- Template CRUD operations
- Share code import/export
- Adaptive polling (10s active, 30s idle)
- Real-time status updates

#### Settings
- Collapsible sections for organization
- Drawing settings (direction, order, density)
- Cooldown settings (account, purchase, check)
- Proxy settings (enabled, rotation mode, logging)
- Type-safe number inputs

### Data Flow

```
Component → API Call → Backend → Database/State → Response → Component State
```

---

## Extension Architecture

### Directory Structure

```
LOAD_UNPACKED/
├── manifest.json             # Extension manifest (V3)
├── background/
│   ├── background.js         # Main background script
│   └── modules/              # Background modules
├── content-scripts/
│   ├── content.js            # Content script entry point
│   └── modules/              # Content script modules
│       ├── script-injection.js
│       ├── overlay-ui.js
│       ├── token-handling.js
│       ├── event-listeners.js
│       ├── periodic-generation.js
│       └── constants.js
├── injected/
│   ├── injected.js           # Injected script
│   ├── pawtect_inject.js     # Pawtect integration
│   └── turnstile_inject.js   # Turnstile handling
└── icons/                    # Extension icons
```

### Background Script

**Responsibilities:**
- WebSocket connection to backend
- Adaptive polling (30s active, 2min idle)
- Token wait tracking and auto-reload
- Cookie management
- Message routing

**Key Features:**
- Reduced from 1176 to 616 lines (47% reduction)
- Modular design with clear separation of concerns
- WebSocket support for real-time updates
- Activity-based polling adjustment

### Content Script

**Responsibilities:**
- UI overlay injection
- Token extraction and handling
- Event listeners for page interactions
- Periodic token generation

**Modularization:**
- Split into 6 focused modules
- Single responsibility per module
- Reduced from 604 to 16 lines (entry point)

### Manifest V3

**Permissions (Minimal):**
- `storage` - Extension data storage
- `cookies` - Cookie access for authentication
- `alarms` - Scheduled tasks
- `tabs` - Tab management

**Removed Permissions:**
- ~~`browsingData`~~ - Was allowing clearing all browser data
- ~~`scripting`~~ - Was allowing arbitrary code injection

---

## Data Flow

### Template Execution Flow

```
1. User starts template via Frontend
2. Frontend sends POST /api/templates/:id/start
3. Backend validates request
4. TemplateManager begins execution loop
   a. Get ready users (with sufficient charges)
   b. Check pixels for mismatches
   c. Paint pixels using WPlacer client
   d. Handle errors with retry logic
   e. Update template status
5. Extension provides tokens via WebSocket
6. Frontend polls for status updates
```

### Token Request Flow

```
1. Backend needs token for painting
2. TokenManager requests token from queue
3. If queue empty, sends WebSocket message to extension
4. Extension receives request
5. Content script extracts token from page
6. Extension sends token via WebSocket
7. TokenManager validates and queues token
8. WPlacer client uses token for API call
```

### User Status Check Flow

```
1. Frontend requests status check
2. Backend receives request
3. Routes/users.ts acquires user lock
4. Parallel status checks with Promise.all()
5. Error classification (transient/permanent/auth)
6. Retry with exponential backoff for transient errors
7. Release user lock
8. Return results to frontend
```

---

## Communication Protocols

### HTTP API

- RESTful endpoints for CRUD operations
- JSON request/response format
- Zod validation middleware
- Rate limiting on sensitive endpoints

### WebSocket

- Real-time token requests
- Template status updates
- Extension connection management
- Automatic reconnection with delay

### Extension Messaging

- Chrome extension message passing
- Background ↔ Content script communication
- Popup ↔ Background script communication
- Type-safe message interfaces

---

## Security Architecture

### Authentication

- JWT token-based authentication for wplace.live
- Cookie storage with password masking in frontend
- Token validation before use
- Expiration checking

### Data Protection

- TLS verification enabled (critical security fix)
- Cookie inputs use password type
- Minimal extension permissions
- No arbitrary code execution (permissions removed)

### Rate Limiting

- Express rate-limiting middleware
- Per-user cooldown settings
- Token queue size limits
- Request timeout protection

---

## Performance Optimizations

### Backend

- Parallel user status checks with Promise.all()
- Charge prediction to reduce API calls
- Token queue with promise cleanup
- Adaptive polling in extension
- WebSocket for real-time updates

### Frontend

- Adaptive polling (10s active, 30s idle)
- Conditional polling based on template state
- Proper interval cleanup with useRef
- Type-safe state management

### Extension

- Activity-based polling (30s active, 2min idle)
- Reduced code size (47% reduction in background)
- Modular content scripts
- WebSocket fallback to polling

---

## Error Handling

### Error Classification

- **Transient Errors:** Network issues, temporary failures (retry with backoff)
- **Permanent Errors:** Invalid tokens, banned accounts (no retry)
- **Auth Errors:** Authentication failures (user action required)

### Retry Logic

- Exponential backoff for transient errors
- Configurable max retries
- Error logging with emoji indicators
- User lock acquisition for concurrent operations

---

## Testing Strategy

### Current Coverage

- Validation middleware tests
- Limited scope (<5% coverage)

### Recommended Tests

- Unit tests for services (TokenManager, TemplateManager, WPlacer client)
- Integration tests for API endpoints
- E2E tests for user workflows
- Extension interaction tests

---

## Deployment Architecture

### Development

```bash
npm run dev  # Both backend and frontend with hot-reload
```

### Production

```bash
npm run build  # Build TypeScript
npm start      # Run compiled server
```

### Environment Variables

- `.env` file for configuration
- Host and port settings
- Extension port configuration
- Feature flags

---

## Future Improvements

### High Priority

1. Complete dependency injection migration
2. Implement state management pattern for extension
3. Remove remaining `any` types
4. Add comprehensive test suite (50% coverage target)
5. Implement WebSocket for frontend real-time updates

### Medium Priority

1. Add caching layer for API calls
2. Implement parallel pixel checking
3. Add performance monitoring
4. Create pre-commit hooks
5. Improve error messages

### Low Priority

1. Add code splitting for frontend
2. Implement settings presets
3. Add debug mode
4. Create development tools

---

## Technology Stack

### Backend

- **Runtime:** Node.js >= 22.0.0
- **Framework:** Express 5.1.0
- **Language:** TypeScript 5.3.3
- **Validation:** Zod 3.23.0
- **Logging:** Winston 3.11.0
- **WebSocket:** ws 8.18.3
- **HTTP Client:** impit 0.5.3
- **Image Processing:** canvas 3.2.0

### Frontend

- **Framework:** React
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** CSS
- **Icons:** Lucide (via shadcn/ui)

### Extension

- **Manifest:** V3
- **Target:** Chrome/Brave
- **Scripts:** Vanilla JavaScript

---

## Contributing

For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

For development setup, see [development.md](development.md).
