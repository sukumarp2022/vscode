# VSCode Hooks Setup Guide

This guide will help you set up and configure the VSCode Hooks System for your development workflow.

## Quick Start

### 1. Enable Hooks in VSCode Settings

Add the following to your VSCode settings (`settings.json`):

```json
{
  "hooks.enabled": true,
  "hooks.timeout": 10000
}
```

### 2. Create a Workspace Hooks Configuration

Create a `.vscode/hooks.json` file in your workspace root:

```json
{
  "$schema": "vscode://schemas/hooks",
  "hooks": {
    "pre-commit": [
      {
        "script": "./scripts/pre-commit.sh",
        "timeout": 30000,
        "abortOnFailure": true
      }
    ]
  }
}
```

### 3. Create Your First Hook Script

Create a simple pre-commit hook script:

```bash
#!/bin/bash
# scripts/pre-commit.sh

echo "Running pre-commit hooks..."

# Run your linting
npm run lint

# Run your tests
npm test

echo "✅ Pre-commit hooks passed!"
```

Make the script executable:
```bash
chmod +x scripts/pre-commit.sh
```

## Common Setup Scenarios

### Scenario 1: JavaScript/TypeScript Project with Linting

#### `.vscode/hooks.json`
```json
{
  "hooks": {
    "pre-commit": [
      {
        "command": "npm",
        "args": ["run", "lint"],
        "timeout": 15000,
        "abortOnFailure": true
      },
      {
        "command": "npm",
        "args": ["run", "test"],
        "timeout": 30000,
        "abortOnFailure": true
      }
    ],
    "file-save": [
      {
        "command": "npx",
        "args": ["prettier", "--write", "${file}"],
        "timeout": 5000,
        "abortOnFailure": false
      }
    ]
  }
}
```

#### `package.json` scripts
```json
{
  "scripts": {
    "lint": "eslint . --ext .js,.ts,.jsx,.tsx",
    "test": "jest",
    "format": "prettier --write ."
  }
}
```

### Scenario 2: Python Project with Security Scanning

#### `.vscode/hooks.json`
```json
{
  "hooks": {
    "pre-commit": [
      {
        "command": "python",
        "args": ["-m", "flake8", "."],
        "timeout": 10000,
        "abortOnFailure": true
      },
      {
        "command": "python",
        "args": ["-m", "bandit", "-r", "."],
        "timeout": 20000,
        "abortOnFailure": true
      }
    ],
    "pre-push": [
      {
        "command": "python",
        "args": ["-m", "pytest"],
        "timeout": 60000,
        "abortOnFailure": true
      }
    ]
  }
}
```

### Scenario 3: Copilot Integration with Security Filtering

#### `.vscode/hooks.json`
```json
{
  "hooks": {
    "pre-copilot-prompt": [
      {
        "script": "./scripts/filter-prompt.js",
        "timeout": 5000,
        "abortOnFailure": true,
        "env": {
          "SECURITY_LEVEL": "high"
        }
      }
    ],
    "pre-context-attach": [
      {
        "command": "python",
        "args": ["./scripts/sanitize-context.py"],
        "timeout": 3000,
        "abortOnFailure": true
      }
    ]
  }
}
```

#### `scripts/filter-prompt.js`
```javascript
#!/usr/bin/env node

const prompt = process.env.COPILOT_PROMPT || process.argv[2] || '';

// Remove sensitive patterns
const filteredPrompt = prompt
  .replace(/password\s*[:=]\s*['"]?[^'"\\s]+['"]?/gi, '[REDACTED]')
  .replace(/api[_-]?key\s*[:=]\s*['"]?[^'"\\s]+['"]?/gi, '[REDACTED]')
  .replace(/token\s*[:=]\s*['"]?[^'"\\s]+['"]?/gi, '[REDACTED]');

console.log(filteredPrompt);
```

### Scenario 4: Multi-Language Project with Comprehensive Checks

#### `.vscode/hooks.json`
```json
{
  "hooks": {
    "pre-commit": [
      {
        "script": "./hooks/lint-check.sh",
        "timeout": 15000,
        "abortOnFailure": true
      },
      {
        "script": "./hooks/security-scan.js",
        "timeout": 30000,
        "abortOnFailure": false
      },
      {
        "script": "./hooks/format-check.sh",
        "timeout": 10000,
        "abortOnFailure": false
      }
    ],
    "pre-push": [
      {
        "script": "./hooks/full-test-suite.sh",
        "timeout": 300000,
        "abortOnFailure": true
      }
    ],
    "workspace-open": [
      {
        "script": "./hooks/setup-environment.sh",
        "timeout": 60000,
        "abortOnFailure": false
      }
    ]
  }
}
```

## Advanced Configuration

### Environment Variables

Hooks receive the following environment variables:

- `HOOK_TYPE`: The type of hook being executed
- `WORKSPACE_FOLDER`: Path to the workspace folder
- `ACTIVE_FILE`: Path to the currently active file
- `ACTIVE_LANGUAGE`: Language of the currently active file
- `COPILOT_PROMPT`: For Copilot-related hooks
- `HOOK_FILES`: Comma-separated list of files (for commit hooks)

### Variable Substitution

You can use the following variables in your hook configurations:

- `${workspaceFolder}`: Path to the workspace folder
- `${file}`: Path to the current file
- `${fileDirname}`: Directory of the current file
- `${fileBasename}`: Basename of the current file
- `${fileExtname}`: Extension of the current file

Example:
```json
{
  "hooks": {
    "file-save": [
      {
        "command": "eslint",
        "args": ["--fix", "${file}"],
        "cwd": "${workspaceFolder}",
        "timeout": 5000
      }
    ]
  }
}
```

### Conditional Hooks

You can create conditional hooks by using scripts that check conditions:

```bash
#!/bin/bash
# hooks/conditional-hook.sh

# Only run on TypeScript files
if [[ "${ACTIVE_FILE}" == *.ts ]]; then
  npx tsc --noEmit "${ACTIVE_FILE}"
fi
```

### Hook Chaining

Chain multiple hooks together by having them call each other:

```json
{
  "hooks": {
    "pre-commit": [
      {
        "script": "./hooks/01-lint.sh",
        "timeout": 10000,
        "abortOnFailure": true
      },
      {
        "script": "./hooks/02-test.sh",
        "timeout": 30000,
        "abortOnFailure": true
      },
      {
        "script": "./hooks/03-security.sh",
        "timeout": 20000,
        "abortOnFailure": false
      }
    ]
  }
}
```

## Best Practices

### 1. Keep Hooks Fast

```json
{
  "hooks": {
    "pre-commit": [
      {
        "script": "./hooks/quick-lint.sh",
        "timeout": 5000,
        "abortOnFailure": true
      }
    ],
    "pre-push": [
      {
        "script": "./hooks/full-test-suite.sh",
        "timeout": 300000,
        "abortOnFailure": true
      }
    ]
  }
}
```

### 2. Provide Meaningful Feedback

```bash
#!/bin/bash
# hooks/verbose-hook.sh

echo "🔍 Running code quality checks..."

if ! npm run lint; then
  echo "❌ Linting failed. Please fix the issues above."
  exit 1
fi

echo "✅ All checks passed!"
```

### 3. Use Appropriate Timeouts

```json
{
  "hooks": {
    "file-save": [
      {
        "command": "prettier",
        "args": ["--write", "${file}"],
        "timeout": 2000
      }
    ],
    "pre-commit": [
      {
        "command": "npm",
        "args": ["run", "lint"],
        "timeout": 15000
      }
    ],
    "pre-push": [
      {
        "command": "npm",
        "args": ["run", "test"],
        "timeout": 60000
      }
    ]
  }
}
```

### 4. Handle Errors Gracefully

```bash
#!/bin/bash
# hooks/graceful-hook.sh

set -e

echo "Running pre-commit checks..."

# Run linting
if ! npm run lint 2>/dev/null; then
  echo "⚠️  Linting issues found. Please review."
  # Don't exit - allow commit to proceed
fi

# Run tests
if ! npm run test 2>/dev/null; then
  echo "❌ Tests failed. Commit blocked."
  exit 1
fi

echo "✅ Pre-commit checks completed!"
```

### 5. Create Reusable Hook Scripts

Create a `hooks/` directory with reusable scripts:

```
hooks/
├── lint-js.sh
├── lint-python.sh
├── test-runner.sh
├── security-scan.js
├── format-code.sh
└── utils/
    ├── check-file-type.sh
    └── notify-result.sh
```

### 6. Use Configuration Files

Create configuration files for complex hooks:

```json
// hooks/config.json
{
  "linting": {
    "extensions": [".js", ".ts", ".jsx", ".tsx"],
    "excludePatterns": ["node_modules", "dist", "build"]
  },
  "testing": {
    "testCommand": "npm test",
    "timeout": 30000
  },
  "security": {
    "scanPatterns": ["password", "api-key", "secret"],
    "severity": "high"
  }
}
```

## Troubleshooting

### Common Issues

1. **Hook not executing**
   - Check script permissions: `chmod +x script.sh`
   - Verify script path is correct
   - Check VSCode logs for errors

2. **Timeout errors**
   - Increase timeout value
   - Optimize script performance
   - Consider using async hooks for long-running tasks

3. **Environment issues**
   - Ensure required tools are installed
   - Check PATH environment variable
   - Use absolute paths when necessary

### Debug Mode

Enable debug logging:

```json
{
  "hooks.enabled": true,
  "hooks.debug": true,
  "log.level": "trace"
}
```

### Testing Hooks

Test hooks manually:

```bash
# Test a pre-commit hook
./hooks/pre-commit.sh

# Test with environment variables
HOOK_TYPE=pre-commit WORKSPACE_FOLDER=$(pwd) ./hooks/pre-commit.sh
```

## Migration Guide

### From Git Hooks

If you have existing Git hooks, you can migrate them:

1. Copy your `.git/hooks/pre-commit` to `hooks/pre-commit.sh`
2. Update your hooks configuration:

```json
{
  "hooks": {
    "pre-commit": [
      {
        "script": "./hooks/pre-commit.sh",
        "timeout": 30000,
        "abortOnFailure": true
      }
    ]
  }
}
```

### From Other Hook Systems

1. Identify equivalent hook types
2. Convert scripts to use VSCode hooks environment variables
3. Update timeout and error handling settings
4. Test thoroughly before deploying

## Examples Repository

For more examples and templates, see the examples directory:

- `examples/hooks.json` - Comprehensive configuration
- `examples/preprocess-prompt.js` - Copilot prompt preprocessing
- `examples/security-scan.js` - Security scanning
- `examples/lint-check.sh` - Linting and formatting
- `examples/filter-context.py` - Context filtering

## Support

For issues and questions:

1. Check the VSCode output panel for hook execution logs
2. Review the hook configuration schema
3. Test hooks manually from the command line
4. Consult the comprehensive README.md for detailed documentation