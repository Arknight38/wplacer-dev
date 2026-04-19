# Development Guide

**Project:** wplacer  
**Version:** 5.6.2  
**Last Updated:** April 19, 2026

---

## Prerequisites

- Node.js >= 22.0.0
- NPM >= 10.0.0
- Git (optional but recommended)
- TypeScript knowledge
- React knowledge (for frontend development)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/luluwaffless/wplacer.git
cd wplacer
```

### 2. Install Dependencies

```bash
npm install
cd frontend
npm install
cd ..
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to configure your settings:

```env
# Server Configuration
HOST=127.0.0.1
PORT=3000

# Extension Configuration
EXTENSION_PORT=3000

# Feature Flags
ENABLE_PROXY_ROTATION=true
ENABLE_WEBSOCKET=true
```

### 4. Build the Project

```bash
npm run build
```

This compiles TypeScript to the `dist/` directory.

---

## Development Workflow

### Running in Development Mode

#### Option 1: Run Both Backend and Frontend

```bash
npm run dev
```

This runs:
- Backend with `tsx watch` (hot-reload)
- Frontend with Vite dev server (hot-reload)

#### Option 2: Run Separately

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### Running in Production Mode

```bash
npm run build
npm start
```

This runs the compiled server from `dist/server.js`.

---

## Project Structure

### Backend Structure

```
src/
├── server.ts                 # Main entry point
├── config/
│   ├── constants.ts          # Configuration constants
│   └── settings.ts           # Settings management
├── middleware/
│   └── validation.ts         # Request validation
├── routes/
│   ├── templates.ts          # Template endpoints
│   ├── users.ts              # User endpoints
│   └── settings.ts           # Settings endpoints
├── services/
│   ├── wplacer-client.ts     # WPlace API client
│   ├── token-manager.ts      # Token management
│   ├── template-manager.ts   # Template execution
│   ├── charge-cache.ts       # Charge caching
│   ├── tile-manager.ts       # Tile management
│   └── http-client.ts        # HTTP client
├── utils/
│   ├── logger.ts             # Logging utilities
│   └── helpers.ts            # Helper functions
└── __tests__/
    └── validation.test.ts    # Validation tests
```

### Frontend Structure

```
frontend/
├── src/
│   ├── App.tsx               # Main component
│   ├── index.css             # Global styles
│   ├── components/
│   │   ├── ManageUsers.tsx   # User management
│   │   ├── ManageTemplates.tsx # Template management
│   │   └── Settings.tsx      # Settings UI
│   ├── assets/               # Static assets
│   └── hooks/                # Custom hooks
├── public/
│   └── icons/                # Icons
└── package.json              # Frontend dependencies
```

### Extension Structure

```
LOAD_UNPACKED/
├── manifest.json             # Extension manifest
├── background/
│   ├── background.js         # Background script
│   └── modules/              # Background modules
├── content-scripts/
│   ├── content.js            # Content script entry
│   └── modules/              # Content modules
├── injected/
│   ├── injected.js           # Injected scripts
│   ├── pawtect_inject.js     # Pawtect integration
│   └── turnstile_inject.js   # Turnstile handling
└── icons/                    # Extension icons
```

---

## Available Scripts

### Backend Scripts

```bash
npm run dev          # Run backend in dev mode
npm run dev:backend  # Run backend only
npm run build        # Build TypeScript
npm run build:watch  # Build with watch mode
npm run start        # Run production server
npm run lint         # Run ESLint
npm run format       # Format with Prettier
```

### Frontend Scripts

```bash
cd frontend
npm run dev          # Run frontend dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run format       # Format with Prettier
```

### Testing Scripts

```bash
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

---

## Code Style

### TypeScript Configuration

The project uses TypeScript with strict mode enabled. See `tsconfig.json` for configuration.

### ESLint

ESLint is configured for both backend and frontend:

```bash
npm run lint         # Lint backend
cd frontend && npm run lint  # Lint frontend
```

### Prettier

Prettier is used for code formatting:

```bash
npm run format       # Format backend
cd frontend && npm run format  # Format frontend
```

### EditorConfig

The project uses `.editorconfig` for consistent editor settings.

---

## Testing

### Running Tests

```bash
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Writing Tests

Tests are written using Jest. Place test files in `src/__tests__/` or alongside source files with `.test.ts` suffix.

Example test:

```typescript
describe('Validation', () => {
  it('should validate template ID', () => {
    const result = validateTemplateId('valid-id');
    expect(result).toBe(true);
  });
});
```

### Current Test Coverage

The project currently has minimal test coverage (<5%). The recent refactoring has made the codebase more testable, providing an opportunity to add comprehensive tests.

---

## API Documentation

The project uses Swagger/OpenAPI for API documentation. Access the Swagger UI at:

```
http://127.0.0.1:3000/api-docs
```

For detailed API documentation, see [api.md](api.md).

---

## Debugging

### Backend Debugging

1. Set breakpoints in your IDE
2. Run in development mode:
   ```bash
   npm run dev:backend
   ```
3. Attach debugger to the process

### Frontend Debugging

1. Open browser DevTools (F12)
2. React DevTools extension recommended
3. Run frontend in dev mode:
   ```bash
   npm run dev:frontend
   ```

### Extension Debugging

1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" and select `LOAD_UNPACKED`
4. Click on the extension to view background script logs
5. For content script debugging, open DevTools on wplace.live

### Logging

The project uses Winston for logging. Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

---

## Common Development Tasks

### Adding a New API Endpoint

1. Add route in `src/routes/`
2. Add validation schema in `src/middleware/validation.ts`
3. Implement handler logic
4. Add Swagger documentation comment
5. Test the endpoint

Example:

```typescript
// src/routes/example.ts
import express from 'express';
import { validate } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * /api/example:
 *   get:
 *     summary: Get example data
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/example', validate(exampleSchema), async (req, res) => {
  // Handler logic
});
```

### Adding a New Service

1. Create service file in `src/services/`
2. Use dependency injection pattern
3. Add proper TypeScript interfaces
4. Implement error handling
5. Add unit tests

Example:

```typescript
// src/services/example-service.ts
export interface ExampleContext {
  httpClient: WPlaceHttpClient;
  logger: Logger;
}

export class ExampleService {
  constructor(private context: ExampleContext) {}

  async doSomething(): Promise<Result> {
    // Implementation
  }
}
```

### Adding a New Frontend Component

1. Create component in `frontend/src/components/`
2. Use TypeScript for props
3. Follow existing component patterns
4. Add proper error handling
5. Test in browser

Example:

```typescript
// frontend/src/components/Example.tsx
interface ExampleProps {
  data: string;
  onUpdate: (value: string) => void;
}

export function Example({ data, onUpdate }: ExampleProps) {
  return (
    <div>
      <input value={data} onChange={(e) => onUpdate(e.target.value)} />
    </div>
  );
}
```

### Modifying Extension

1. Edit files in `LOAD_UNPACKED/`
2. Reload extension in browser
3. Test on wplace.live
4. Check background script console for errors

---

## Dependency Injection Pattern

The project uses dependency injection to improve testability and reduce coupling:

```typescript
// Define context interface
interface ServiceContext {
  httpClient: WPlaceHttpClient;
  logger: Logger;
  config: Config;
}

// Create service with injected dependencies
export class MyService {
  constructor(private context: ServiceContext) {}

  async execute(): Promise<void> {
    const response = await this.context.httpClient.get('/api/endpoint');
    this.context.logger.info('Request completed');
  }
}

// Use in routes
const context: ServiceContext = {
  httpClient: new WPlaceHttpClient(),
  logger: logger,
  config: config,
};

const service = new MyService(context);
```

---

## Environment Variables

Available environment variables in `.env`:

```env
# Server
HOST=127.0.0.1
PORT=3000

# Extension
EXTENSION_PORT=3000

# Features
ENABLE_PROXY_ROTATION=true
ENABLE_WEBSOCKET=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clear build cache
rm -rf dist
rm -rf node_modules
npm install
npm run build
```

### Port Already in Use

If the port is already in use:

```bash
# Change port in .env
PORT=3001

# Or kill the process using the port
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Extension Not Loading

If the extension won't load:

1. Check `manifest.json` for syntax errors
2. Ensure all referenced files exist
3. Check browser console for errors
4. Try reloading the extension

### TypeScript Errors

If you encounter TypeScript errors:

```bash
# Rebuild type definitions
npm run build

# Check tsconfig.json configuration
# Ensure all dependencies are installed
```

---

## Performance Profiling

### Backend Profiling

```bash
# Run with Node.js profiler
node --prof dist/server.js

# Analyze profile
node --prof-process isolate-*.log > profile.txt
```

### Frontend Profiling

Use Chrome DevTools Performance tab to profile React components.

---

## Contributing

For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Additional Resources

- [Architecture Documentation](architecture.md)
- [API Documentation](api.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Codebase Review](codebase-review.md)
