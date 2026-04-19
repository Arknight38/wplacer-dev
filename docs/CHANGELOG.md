# Changelog

All notable changes to the wplacer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.6.2] - 2026-04-19

### Added

- Template share codes with RLE compression for easy template sharing
- WebSocket support for real-time token requests
- Graceful shutdown with state persistence
- Parallel user status checks for improved performance
- Adaptive polling in extension (30s active, 2min idle)
- Dependency injection context in TemplateManager
- HTTP client injection in WPlacer client for better testability
- Cancellable sleep operations for responsive settings updates
- Token wait tracking and auto-reload logic
- Proxy logging option
- Comprehensive API documentation
- Architecture documentation
- Development guide
- Contributing guidelines

### Changed

- Backend refactoring with structured server state management
- Server now uses `serverState` object instead of scattered global variables
- Template manager methods extracted into smaller, focused functions
- Extension background script reduced from 1176 to 616 lines (47% reduction)
- Content script modularized into 6 separate modules
- Frontend settings component better organized with collapsible sections
- Settings state now uses proper number types instead of strings
- Cookie inputs now use password type for security
- Validation settings schema now includes all 13 fields with proper validation
- Token manager completely rewritten with thread-safe locking
- Error classification implemented in routes/users.ts
- Retry logic with exponential backoff for transient errors
- Manifest version synchronized with package.json (5.6.2)

### Fixed

- Critical security issue: TLS verification now always enabled (was disabled)
- Extension excessive permissions removed (browsingData, scripting)
- Duplicate MS constant definitions removed from helpers.ts
- Polling inefficiency in ManageTemplates - now adaptive (10s active, 30s idle)
- Type coercion issues in Settings component
- Graceful shutdown implementation
- Keep-alive logic with cached WPlacer import
- Hardcoded constants in server.ts now use config/environment variables

### Security

- TLS verification enabled in HTTP client (critical security fix)
- Excessive browser permissions removed from extension manifest
- Cookie inputs now use password type in frontend
- Minimal required permissions: storage, cookies, alarms, tabs

### Performance

- Parallel user status checks with Promise.all()
- Adaptive polling in extension reduces unnecessary requests
- Charge prediction reduces API calls
- Token promise cleanup prevents memory leaks
- Extension code size reduced by 47%

### Documentation

- Added comprehensive architecture documentation
- Added API documentation with all endpoints
- Added development guide with setup instructions
- Added contributing guidelines
- Updated README with recent improvements
- Added documentation links in README

---

## [5.6.1] - 2026-03-XX

### Added

- Proxy support with sequential and random rotation modes
- Color-by-color drawing mode
- Template progress tracking
- Desktop notifications for token requests

### Fixed

- Token queue management
- User status check reliability
- Template execution stability

---

## [5.6.0] - 2026-02-XX

### Added

- Multi-account support for templates
- Queueing system for multi-account execution
- Advanced template controls (restart, replace, pause)
- Account status checker
- Automatic upgrade purchasing

### Changed

- Improved user management UI
- Enhanced template creation workflow

---

## [5.5.0] - 2026-01-XX

### Added

- Initial version of wplacer bot
- Basic template management
- User account management
- Turnstile token handling
- Browser extension for automation

---

## Version History

| Version | Date | Major Changes |
|---------|------|---------------|
| 5.6.2 | 2026-04-19 | Major refactoring, security fixes, documentation |
| 5.6.1 | 2026-03-XX | Proxy support, performance improvements |
| 5.6.0 | 2026-02-XX | Multi-account support, queueing system |
| 5.5.0 | 2026-01-XX | Initial release |

---

## Categories

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security vulnerability fixes
- **Performance** - Performance improvements
- **Documentation** - Documentation changes

---

## Future Plans

### Planned for 5.7.0

- Complete dependency injection migration
- State management pattern for extension
- Remove remaining `any` types
- Add comprehensive test suite (50% coverage target)
- WebSocket for frontend real-time updates
- Caching layer for API calls
- Parallel pixel checking in template-manager

### Under Consideration

- Settings presets for common configurations
- Code splitting for frontend
- Pre-commit hooks
- Debug mode
- Development tools

---

## Links

- [GitHub Repository](https://github.com/luluwaffless/wplacer)
- [Issues](https://github.com/luluwaffless/wplacer/issues)
- [Discord Server](https://discord.gg/wplacerbot)
