# Contributing Guidelines

**Project:** wplacer  
**Version:** 5.6.2  
**Last Updated:** April 19, 2026

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- NPM >= 10.0.0
- Git
- TypeScript knowledge
- Familiarity with the project architecture

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/wplacer.git
   cd wplacer
   ```
3. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```
4. Create a branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Workflow

### 1. Choose an Issue

- Check existing issues on GitHub
- Comment on the issue you want to work on
- Create a new issue if needed

### 2. Create a Branch

Use descriptive branch names:

```bash
feature/add-proxy-support
fix/token-validation-error
refactor/template-manager
docs/update-readme
```

### 3. Make Changes

- Follow coding standards (see below)
- Write tests for new features
- Update documentation as needed
- Commit frequently with clear messages

### 4. Test Your Changes

```bash
# Run tests
npm test

# Run linter
npm run lint

# Run formatter
npm run format

# Build project
npm run build
```

### 5. Submit Pull Request

- Push your branch to your fork
- Create a pull request to the main repository
- Fill out the PR template
- Wait for code review

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking
- Avoid `any` types - use proper interfaces
- Use JSDoc comments for public APIs

Example:

```typescript
// Good
interface User {
  id: string;
  name: string;
  charges: number;
}

function getUser(id: string): User | null {
  // Implementation
}

// Bad
function getUser(id: any): any {
  // Implementation
}
```

### Naming Conventions

- **Variables/Functions:** camelCase
- **Classes:** PascalCase
- **Constants:** UPPER_SNAKE_CASE
- **Files:** kebab-case
- **Interfaces:** PascalCase with `I` prefix optional

Example:

```typescript
const maxRetries = 3;

class TokenManager {
  private queueSize = 0;
}

function validateToken(token: string): boolean {
  // Implementation
}

// File names
token-manager.ts
user-service.ts
```

### Code Organization

- Keep functions focused and small (<50 lines)
- Extract repeated logic into utility functions
- Use dependency injection for services
- Separate concerns (UI, logic, data)

Example:

```typescript
// Good - focused function
function validateToken(token: string): boolean {
  if (!token || token.length < 10) return false;
  return token.startsWith('0.');
}

// Bad - too many responsibilities
function validateAndStoreAndNotify(token: string): boolean {
  // Does too many things
}
```

### Error Handling

- Use specific error types
- Provide meaningful error messages
- Log errors appropriately
- Handle errors at appropriate levels

Example:

```typescript
// Good
class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

try {
  await apiCall();
} catch (error) {
  if (error instanceof NetworkError) {
    logger.error('Network error:', error.message);
    // Handle network error
  } else {
    throw error; // Re-throw unexpected errors
  }
}

// Bad
try {
  await apiCall();
} catch (error) {
  console.log('Error'); // Not helpful
}
```

### Comments

- Comment **why**, not **what**
- Use JSDoc for public APIs
- Keep comments up to date
- Avoid obvious comments

Example:

```typescript
// Good
// We need to retry with exponential backoff because
// the API rate limits burst requests
async function retryWithBackoff(fn: () => Promise<void>): Promise<void> {
  // Implementation
}

// Bad
// This function retries with backoff
async function retryWithBackoff(fn: () => Promise<void>): Promise<void> {
  // Implementation
}

// Also bad
// Increment i by 1
i++;
```

### React/Frontend

- Use functional components with hooks
- Use TypeScript for props
- Follow React best practices
- Use proper state management

Example:

```typescript
// Good
interface UserCardProps {
  user: User;
  onUpdate: (user: User) => void;
}

export function UserCard({ user, onUpdate }: UserCardProps) {
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    await onUpdate(user);
    setLoading(false);
  };

  return <div>{/* JSX */}</div>;
}

// Bad - missing types
export function UserCard({ user, onUpdate }) {
  // Missing TypeScript
}
```

---

## Pull Request Process

### PR Title

Use conventional commit format:

```
feat: add proxy rotation support
fix: resolve token validation error
refactor: simplify template manager
docs: update API documentation
test: add unit tests for token manager
```

### PR Description

Include:

- **What** you changed
- **Why** you changed it
- **How** you tested it
- **Screenshots** (if UI changes)
- **Breaking changes** (if any)

Example:

```markdown
## What
Added support for proxy rotation with sequential and random modes.

## Why
Users requested the ability to use multiple proxies to reduce ban risk.

## How Tested
- Tested with SOCKS5 and HTTP proxies
- Verified sequential rotation
- Verified random rotation
- Added unit tests for proxy manager

## Breaking Changes
None

## Screenshots
(Attach screenshots if applicable)
```

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests passing
- [ ] No linting errors
- [ ] Commit messages follow conventional format

---

## Testing Guidelines

### Unit Tests

- Test individual functions and classes
- Mock external dependencies
- Test edge cases and error conditions
- Aim for high coverage (>80%)

Example:

```typescript
describe('TokenManager', () => {
  it('should validate valid tokens', () => {
    const manager = new TokenManager();
    expect(manager.isValidToken('0.valid_token')).toBe(true);
  });

  it('should reject invalid tokens', () => {
    const manager = new TokenManager();
    expect(manager.isValidToken('invalid')).toBe(false);
  });

  it('should handle token expiration', () => {
    const manager = new TokenManager();
    const expiredToken = '0.' + Date.now() - 10000;
    expect(manager.isValidToken(expiredToken)).toBe(false);
  });
});
```

### Integration Tests

- Test API endpoints
- Test service interactions
- Use test database/fixtures
- Clean up after tests

### E2E Tests

- Test user workflows
- Test extension interactions
- Use Playwright or similar
- Run in CI/CD pipeline

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test validation.test.ts
```

---

## Documentation

### Code Documentation

- Use JSDoc for public APIs
- Document complex algorithms
- Keep documentation up to date

Example:

```typescript
/**
 * Validates a Turnstile token
 * @param token - The token to validate
 * @returns true if valid, false otherwise
 * @throws {ValidationError} if token format is invalid
 */
function validateToken(token: string): boolean {
  // Implementation
}
```

### README Updates

- Update README for new features
- Update installation instructions if needed
- Add screenshots for UI changes
- Update version number

### API Documentation

- Add Swagger comments for new endpoints
- Update request/response schemas
- Document error responses
- Add usage examples

Example:

```typescript
/**
 * @swagger
 * /api/templates:
 *   post:
 *     summary: Create a new template
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               image:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template created
 *       400:
 *         description: Invalid request
 */
```

---

## Code Review

### Reviewing PRs

- Be constructive and respectful
- Focus on code quality and correctness
- Ask questions if something is unclear
- Suggest improvements, don't just criticize

### Handling Feedback

- Respond to all review comments
- Make requested changes or explain why not
- Be open to suggestions
- Update PR based on feedback

---

## Release Process

Releases are managed by maintainers:

1. Update version in `package.json`
2. Update CHANGELOG
3. Create git tag
4. Publish release on GitHub

---

## Getting Help

- Check existing documentation
- Search existing issues
- Ask questions in issues
- Join the Discord server

---

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 license.

---

## Additional Resources

- [Development Guide](development.md)
- [Architecture Documentation](architecture.md)
- [API Documentation](api.md)
- [Codebase Review](codebase-review.md)
