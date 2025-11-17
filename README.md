# Gate Agent

A configurable CLI tool for running quality gates across JavaScript/TypeScript projects. Orchestrate linting, formatting, type checking, testing, and security scanning with a single command.

## Features

- **Configurable**: Define which gates to run via YAML configuration
- **Extensible**: Built-in support for popular tools (ESLint, Prettier, TypeScript, Jest, Vitest, OSV-Scanner)
- **Multiple Reporters**: Terminal, JSON, and HTML output formats
- **CI/CD Ready**: Proper exit codes and machine-readable output
- **Graceful Handling**: Skips gates when tools aren't configured instead of failing

## Installation

```bash
# Global installation
npm install -g gate-agent

# Or as a dev dependency
npm install --save-dev gate-agent
```

## Quick Start

1. Initialize configuration:

```bash
gate-agent init
```

2. Edit `gate-agent.yml` to enable/disable gates

3. Run quality gates:

```bash
gate-agent run
```

## Quality Gates

### Core Gates (Included)

- **ESLint**: Code quality and style checking
- **Prettier**: Code formatting validation
- **TypeScript**: Type checking with tsc
- **Test Coverage**: Unit test coverage enforcement (Jest/Vitest)
- **OSV Scanner**: Dependency vulnerability scanning
- **ESLint Security**: Security-focused linting rules

## Configuration

Create a `gate-agent.yml` file in your project root:

```yaml
gates:
  # ESLint - Code quality and style checking
  eslint:
    enabled: true
    maxErrors: 0
    maxWarnings: -1 # -1 means unlimited

  # Prettier - Code formatting
  prettier:
    enabled: true

  # TypeScript - Type checking
  typescript:
    enabled: true
    strict: true

  # Test Coverage - Unit test coverage enforcement
  testCoverage:
    enabled: true
    threshold:
      line: 80
      branch: 80
      function: 80
      statement: 80

  # OSV Scanner - Dependency vulnerability scanning
  osvScanner:
    enabled: true

  # ESLint Security - Security-focused linting rules
  eslintSecurity:
    enabled: true

# Reporting configuration
reporting:
  formats:
    - terminal # Colorized terminal output
    - json # Machine-readable JSON
    # - html    # Visual HTML dashboard

  # Output paths (relative to project root)
  outputDir: .gate-agent

# Fail fast - stop on first failing gate
failFast: false
```

## CLI Commands

### `gate-agent run`

Run all enabled quality gates.

```bash
gate-agent run

# Use custom config path
gate-agent run --config path/to/config.yml

# Use custom working directory
gate-agent run --cwd /path/to/project
```

### `gate-agent init`

Create a `gate-agent.yml` configuration file.

```bash
gate-agent init

# Initialize in specific directory
gate-agent init --cwd /path/to/project
```

## Exit Codes

- `0`: All gates passed
- `1`: One or more gates failed
- `2`: Error occurred during execution

## CI/CD Integration

### GitHub Actions

```yaml
name: Quality Gates

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm install -g gate-agent
      - run: gate-agent run
```

### GitLab CI

```yaml
quality-gates:
  image: node:20
  script:
    - npm ci
    - npm install -g gate-agent
    - gate-agent run
  artifacts:
    reports:
      json: .gate-agent/gate-agent-report.json
```

## Prerequisites

Each gate requires its corresponding tool to be installed and configured:

- **ESLint**: Requires `.eslintrc.*` or `eslint.config.js` and `eslint` package
- **Prettier**: Requires `.prettierrc.*` or `prettier.config.js` and `prettier` package
- **TypeScript**: Requires `tsconfig.json` and `typescript` package
- **Test Coverage**: Requires `jest` or `vitest` with coverage enabled
- **OSV Scanner**: Requires [osv-scanner](https://github.com/google/osv-scanner) installed
  ```bash
  go install github.com/google/osv-scanner/cmd/osv-scanner@latest
  ```
- **ESLint Security**: Requires `eslint-plugin-security` or similar security plugins

Gates will be **skipped** (not failed) if their prerequisites are missing.

## Examples

### Terminal Output

```
Quality Gates Report
────────────────────────────────────────────────────────────────────────────────

✓ ESLint - PASSED
  0 error(s), 2 warning(s)

✓ Prettier - PASSED
  All files are formatted correctly

✓ TypeScript - PASSED
  No type errors found

✓ Test Coverage - PASSED
  All coverage thresholds met (85.32% line coverage)

○ OSV Scanner - SKIPPED
  osv-scanner not installed

✓ ESLint Security - PASSED
  No security issues found

────────────────────────────────────────────────────────────────────────────────

Summary:
  Total gates: 6
  Passed: 5
  Failed: 0
  Skipped: 1
  Errors: 0
  Duration: 12.34s

✓ All quality gates passed!
```

### JSON Output

JSON reports are written to `.gate-agent/gate-agent-report.json`:

```json
{
  "results": [
    {
      "name": "ESLint",
      "status": "passed",
      "message": "0 error(s), 2 warning(s)",
      "duration": 2341
    }
  ],
  "summary": {
    "total": 6,
    "passed": 5,
    "failed": 0,
    "skipped": 1,
    "errors": 0,
    "totalDuration": 12340
  },
  "timestamp": "2025-01-17T10:30:00.000Z",
  "success": true
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Formatting
npm run format
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
