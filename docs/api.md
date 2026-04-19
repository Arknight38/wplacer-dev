# API Documentation

**Project:** wplacer  
**Version:** 5.6.2  
**Last Updated:** April 19, 2026  
**Base URL:** `http://127.0.0.1:3000`

---

## Overview

The wplacer API provides RESTful endpoints for managing users, templates, and settings. All endpoints return JSON responses.

### Authentication

The API does not require authentication for local use. For production deployments, implement authentication middleware.

### Rate Limiting

Rate limiting is configured via environment variables:
- `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (default: 900000 = 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)

### Error Responses

All endpoints may return error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

Common HTTP status codes:
- `200 OK` - Request successful
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Users API

### Get All Users

Retrieve all registered users.

**Endpoint:** `GET /api/users`

**Response:**

```json
{
  "user1": {
    "id": "user1",
    "name": "User One",
    "cookies": {
      "j": "jwt_token_here",
      "cf_clearance": "clearance_token"
    },
    "suspendedUntil": 0,
    "proxy": "socks5://127.0.0.1:9050"
  },
  "user2": {
    "id": "user2",
    "name": "User Two",
    "cookies": {
      "j": "jwt_token_here"
    },
    "suspendedUntil": 1713528000
  }
}
```

**Status Codes:**
- `200 OK` - Users retrieved successfully
- `500 Internal Server Error` - Server error

---

### Create User

Create a new user account.

**Endpoint:** `POST /api/users`

**Request Body:**

```json
{
  "id": "user1",
  "name": "User One",
  "cookies": {
    "j": "jwt_token_here",
    "cf_clearance": "clearance_token"
  },
  "proxy": "socks5://127.0.0.1:9050"
}
```

**Fields:**
- `id` (string, required): Unique user identifier
- `name` (string, required): Display name
- `cookies` (object, required): Authentication cookies
  - `j` (string, required): JWT token from wplace.live
  - `cf_clearance` (string, optional): Cloudflare clearance cookie
- `proxy` (string, optional): Proxy URL in format `protocol://ip:port` or `protocol://user:pass:ip:port`

**Response:**

```json
{
  "id": "user1",
  "name": "User One",
  "cookies": {
    "j": "jwt_token_here",
    "cf_clearance": "clearance_token"
  },
  "proxy": "socks5://127.0.0.1:9050",
  "suspendedUntil": 0
}
```

**Status Codes:**
- `201 Created` - User created successfully
- `400 Bad Request` - Invalid request data
- `409 Conflict` - User ID already exists
- `500 Internal Server Error` - Server error

---

### Update User

Update an existing user.

**Endpoint:** `PUT /api/users/:id`

**Request Body:**

```json
{
  "name": "Updated Name",
  "cookies": {
    "j": "new_jwt_token"
  },
  "proxy": "socks5://127.0.0.1:9050"
}
```

**Response:** Updated user object

**Status Codes:**
- `200 OK` - User updated successfully
- `400 Bad Request` - Invalid request data
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

### Delete User

Delete a user account.

**Endpoint:** `DELETE /api/users/:id`

**Response:** `204 No Content`

**Status Codes:**
- `204 No Content` - User deleted successfully
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

### Check User Status

Check the status of a single user.

**Endpoint:** `GET /api/users/:id/status`

**Response:**

```json
{
  "valid": true,
  "droplets": 100,
  "charges": 50,
  "suspended": false,
  "suspendedUntil": null
}
```

**Fields:**
- `valid` (boolean): Whether the user's cookies are valid
- `droplets` (number): Current droplet count
- `charges` (number): Current charge count
- `suspended` (boolean): Whether the account is suspended
- `suspendedUntil` (number|null): Unix timestamp when suspension ends, or null

**Status Codes:**
- `200 OK` - Status retrieved successfully
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

### Check All Users Status

Check the status of all users in parallel.

**Endpoint:** `GET /api/users/status`

**Response:**

```json
{
  "user1": {
    "valid": true,
    "droplets": 100,
    "charges": 50,
    "suspended": false,
    "suspendedUntil": null
  },
  "user2": {
    "valid": false,
    "droplets": 0,
    "charges": 0,
    "suspended": true,
    "suspendedUntil": 1713528000
  }
}
```

**Status Codes:**
- `200 OK` - All statuses retrieved successfully
- `500 Internal Server Error` - Server error

---

## Templates API

### Get All Templates

Retrieve all templates.

**Endpoint:** `GET /api/templates`

**Response:**

```json
{
  "template1": {
    "id": "template1",
    "name": "My Template",
    "width": 10,
    "height": 10,
    "tileX": 0,
    "tileY": 0,
    "pixelX": 0,
    "pixelY": 0,
    "data": [[0, 1, 2], [3, 4, 5]],
    "users": ["user1", "user2"],
    "status": "idle",
    "progress": 0,
    "totalPixels": 100,
    "paintedPixels": 0
  }
}
```

**Fields:**
- `id` (string): Unique template identifier
- `name` (string): Template name
- `width` (number): Template width in pixels
- `height` (number): Template height in pixels
- `tileX` (number): Tile X coordinate
- `tileY` (number): Tile Y coordinate
- `pixelX` (number): Pixel X offset within tile
- `pixelY` (number): Pixel Y offset within tile
- `data` (array): 2D array of color indices
- `users` (array): List of user IDs assigned to template
- `status` (string): Current status (idle, running, paused, completed, error)
- `progress` (number): Progress percentage (0-100)
- `totalPixels` (number): Total pixels to paint
- `paintedPixels` (number): Pixels already painted

**Status Codes:**
- `200 OK` - Templates retrieved successfully
- `500 Internal Server Error` - Server error

---

### Create Template

Create a new template.

**Endpoint:** `POST /api/templates`

**Request Body:**

```json
{
  "id": "template1",
  "name": "My Template",
  "width": 10,
  "height": 10,
  "tileX": 0,
  "tileY": 0,
  "pixelX": 0,
  "pixelY": 0,
  "data": [[0, 1, 2], [3, 4, 5]],
  "users": ["user1", "user2"]
}
```

**Validation:**
- `id` must be unique and contain only alphanumeric characters, hyphens, and underscores
- `width` and `height` must be positive integers
- `data` must be a 2D array matching the specified dimensions
- `users` must be valid existing user IDs

**Response:** Created template object

**Status Codes:**
- `201 Created` - Template created successfully
- `400 Bad Request` - Invalid request data
- `409 Conflict` - Template ID already exists
- `500 Internal Server Error` - Server error

---

### Update Template

Update an existing template.

**Endpoint:** `PUT /api/templates/:id`

**Request Body:**

```json
{
  "name": "Updated Name",
  "users": ["user1"]
}
```

**Response:** Updated template object

**Status Codes:**
- `200 OK` - Template updated successfully
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Template not found
- `500 Internal Server Error` - Server error

---

### Delete Template

Delete a template.

**Endpoint:** `DELETE /api/templates/:id`

**Response:** `204 No Content`

**Status Codes:**
- `204 No Content` - Template deleted successfully
- `404 Not Found` - Template not found
- `500 Internal Server Error` - Server error

---

### Start Template

Start executing a template.

**Endpoint:** `POST /api/templates/:id/start`

**Response:**

```json
{
  "status": "running",
  "message": "Template started"
}
```

**Status Codes:**
- `200 OK` - Template started successfully
- `404 Not Found` - Template not found
- `409 Conflict` - Template already running
- `500 Internal Server Error` - Server error

---

### Pause Template

Pause a running template.

**Endpoint:** `POST /api/templates/:id/pause`

**Response:**

```json
{
  "status": "paused",
  "message": "Template paused"
}
```

**Status Codes:**
- `200 OK` - Template paused successfully
- `404 Not Found` - Template not found
- `409 Conflict` - Template not running
- `500 Internal Server Error` - Server error

---

### Stop Template

Stop a template and reset progress.

**Endpoint:** `POST /api/templates/:id/stop`

**Response:** `204 No Content`

**Status Codes:**
- `204 No Content` - Template stopped successfully
- `404 Not Found` - Template not found
- `500 Internal Server Error` - Server error

---

### Replace Template Image

Replace the image data of an existing template.

**Endpoint:** `POST /api/templates/:id/replace`

**Request Body:**

```json
{
  "width": 20,
  "height": 20,
  "data": [[0, 1, 2], [3, 4, 5]]
}
```

**Response:** Updated template object

**Status Codes:**
- `200 OK` - Image replaced successfully
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Template not found
- `500 Internal Server Error` - Server error

---

### Generate Share Code

Generate a share code for a template.

**Endpoint:** `GET /api/templates/:id/share`

**Response:**

```json
{
  "shareCode": "v1|10|10|base64url_encoded_rle_data"
}
```

The share code uses RLE (Run-Length Encoding) compression for efficient sharing.

**Status Codes:**
- `200 OK` - Share code generated successfully
- `404 Not Found` - Template not found
- `500 Internal Server Error` - Server error

---

### Import from Share Code

Import a template from a share code.

**Endpoint:** `POST /api/templates/import`

**Request Body:**

```json
{
  "shareCode": "v1|10|10|base64url_encoded_rle_data",
  "id": "imported-template",
  "name": "Imported Template",
  "tileX": 0,
  "tileY": 0,
  "pixelX": 0,
  "pixelY": 0,
  "users": ["user1"]
}
```

**Response:** Imported template object

**Status Codes:**
- `201 Created` - Template imported successfully
- `400 Bad Request` - Invalid share code or request data
- `409 Conflict` - Template ID already exists
- `500 Internal Server Error` - Server error

---

## Settings API

### Get Settings

Retrieve current settings.

**Endpoint:** `GET /api/settings`

**Response:**

```json
{
  "accountCooldown": 5000,
  "purchaseCooldown": 10000,
  "keepAliveCooldown": 60000,
  "checkCooldown": 30000,
  "drawingDirection": "ttb",
  "drawingOrder": "linear",
  "drawingDensity": 1,
  "browserLaunch": false,
  "autoPurchaseMaxCharge": true,
  "autoPurchaseExtraCharge": true,
  "dropletReserve": 100,
  "chargeThreshold": 10,
  "proxyEnabled": false,
  "proxyRotationMode": "sequential",
  "proxyLogging": false,
  "proxyCount": 0
}
```

**Fields:**
- `accountCooldown` (number): Cooldown between account switches (ms)
- `purchaseCooldown` (number): Cooldown between purchases (ms)
- `keepAliveCooldown` (number): Cooldown for keep-alive requests (ms)
- `checkCooldown` (number): Cooldown for status checks (ms)
- `drawingDirection` (string): Drawing direction (ttb, btt, ltr, rtl, center_out, random)
- `drawingOrder` (string): Drawing order (linear, color)
- `drawingDensity` (number): Drawing density (1-10)
- `browserLaunch` (boolean): Whether to auto-launch browser
- `autoPurchaseMaxCharge` (boolean): Auto-purchase max charge upgrades
- `autoPurchaseExtraCharge` (boolean): Auto-purchase extra charges
- `dropletReserve` (number): Droplets to reserve (min 0)
- `chargeThreshold` (number): Minimum charges before painting (min 0)
- `proxyEnabled` (boolean): Whether proxy rotation is enabled
- `proxyRotationMode` (string): Proxy rotation mode (sequential, random)
- `proxyLogging` (boolean): Whether to log proxy usage
- `proxyCount` (number): Number of loaded proxies (read-only)

**Status Codes:**
- `200 OK` - Settings retrieved successfully
- `500 Internal Server Error` - Server error

---

### Update Settings

Update settings.

**Endpoint:** `PUT /api/settings`

**Request Body:**

```json
{
  "accountCooldown": 5000,
  "drawingDirection": "ttb",
  "proxyEnabled": true
}
```

Only include fields you want to update. Unspecified fields remain unchanged.

**Response:** `200 OK`

**Status Codes:**
- `200 OK` - Settings updated successfully
- `400 Bad Request` - Invalid request data
- `500 Internal Server Error` - Server error

---

## WebSocket API

### Connection

Connect to the WebSocket server for real-time updates.

**Endpoint:** `ws://127.0.0.1:3000`

### Message Format

All messages are JSON objects with a `type` field.

### Client → Server Messages

#### Token Request

Request a Turnstile token from the extension.

```json
{
  "type": "tokenRequest",
  "userId": "user1"
}
```

### Server → Client Messages

#### Token Response

Server responds with token from extension.

```json
{
  "type": "tokenResponse",
  "userId": "user1",
  "token": "0.valid_turnstile_token"
}
```

#### Template Update

Real-time template status updates.

```json
{
  "type": "templateUpdate",
  "templateId": "template1",
  "status": "running",
  "progress": 45,
  "paintedPixels": 450
}
```

#### User Update

Real-time user status updates.

```json
{
  "type": "userUpdate",
  "userId": "user1",
  "status": "active",
  "charges": 50
}
```

---

## Data Types

### User

```typescript
interface User {
  id: string;
  name: string;
  cookies: {
    j: string;
    cf_clearance?: string;
  };
  proxy?: string;
  suspendedUntil: number;
}
```

### Template

```typescript
interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
  data: number[][];
  users: string[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  progress: number;
  totalPixels: number;
  paintedPixels: number;
}
```

### Settings

```typescript
interface Settings {
  accountCooldown: number;
  purchaseCooldown: number;
  keepAliveCooldown: number;
  checkCooldown: number;
  drawingDirection: 'ttb' | 'btt' | 'ltr' | 'rtl' | 'center_out' | 'random';
  drawingOrder: 'linear' | 'color';
  drawingDensity: number;
  browserLaunch: boolean;
  autoPurchaseMaxCharge: boolean;
  autoPurchaseExtraCharge: boolean;
  dropletReserve: number;
  chargeThreshold: number;
  proxyEnabled: boolean;
  proxyRotationMode: 'sequential' | 'random';
  proxyLogging: boolean;
}
```

---

## Share Code Format

Share codes use RLE compression for efficient template sharing.

**Format:** `v1|<width>|<height>|<base64url_encoded_rle_data>`

**RLE Format:** `count,value;count,value;...`

**Example:**
- Original: `[1, 1, 1, 2, 2, 3]`
- RLE: `3,1;2,2;1,3`
- Base64url: `MywxOzIsMjsx` (example)

**Limitations:**
- Maximum count per run: 255
- Values must be valid color indices

---

## Error Handling

### Error Classification

The API classifies errors into three categories:

1. **Transient Errors:** Network issues, temporary failures (automatically retried with exponential backoff)
2. **Permanent Errors:** Invalid tokens, banned accounts (no retry)
3. **Auth Errors:** Authentication failures (user action required)

### Common Errors

#### Invalid Token

```json
{
  "error": "Invalid JWT token",
  "category": "auth"
}
```

#### Network Error

```json
{
  "error": "Network timeout",
  "category": "transient"
}
```

#### Account Suspended

```json
{
  "error": "Account suspended until 2024-04-20T00:00:00Z",
  "category": "permanent"
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse.

**Default Limits:**
- Window: 15 minutes
- Max Requests: 100 per window

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1713528000
```

**Rate Limit Exceeded Response:**

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 300
}
```

---

## Swagger UI

Interactive API documentation is available via Swagger UI:

**URL:** `http://127.0.0.1:3000/api-docs`

This provides:
- Interactive API testing
- Request/response schemas
- Parameter documentation
- Example requests

---

## Examples

### Create and Start a Template

```bash
# Create template
curl -X POST http://127.0.0.1:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-template",
    "name": "My Drawing",
    "width": 10,
    "height": 10,
    "tileX": 0,
    "tileY": 0,
    "pixelX": 0,
    "pixelY": 0,
    "data": [[0,1,2],[3,4,5]],
    "users": ["user1"]
  }'

# Start template
curl -X POST http://127.0.0.1:3000/api/templates/my-template/start
```

### Check User Status

```bash
curl http://127.0.0.1:3000/api/users/user1/status
```

### Update Settings

```bash
curl -X PUT http://127.0.0.1:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "drawingDirection": "ttb",
    "accountCooldown": 5000
  }'
```

### Generate Share Code

```bash
curl http://127.0.0.1:3000/api/templates/my-template/share
```

---

## Additional Resources

- [Architecture Documentation](architecture.md)
- [Development Guide](development.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Codebase Review](codebase-review.md)
