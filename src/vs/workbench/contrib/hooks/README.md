# VSCode Hooks System

The VSCode Hooks System provides a way to run custom scripts or commands before various actions in VSCode, particularly for customizing GitHub Copilot behavior and other development workflows.

## Features

- **Multiple Hook Types**: Support for pre-copilot-prompt, pre-context-attach, pre-commit, pre-push, pre-pull, post-copilot-response, workspace-open, and file-save hooks
- **Flexible Configuration**: Configure hooks through VSCode settings or workspace-specific `.vscode/hooks.json` files
- **Script Execution**: Run shell scripts, Node.js scripts, Python scripts, or any executable command
- **Timeout Handling**: Configurable timeouts for hook execution
- **Error Handling**: Option to abort actions if hooks fail
- **Async Support**: Run hooks asynchronously when appropriate
- **Environment Variables**: Pass custom environment variables to hooks
- **Context Data**: Hooks receive relevant context data (file paths, prompt content, etc.)

## Hook Types

### Pre-Copilot Prompt (`pre-copilot-prompt`)
Triggered before sending a prompt to GitHub Copilot. Useful for:
- Preprocessing prompts to remove sensitive information
- Adding context information
- Implementing custom validation logic

### Pre-Context Attach (`pre-context-attach`)
Triggered before attaching context to Copilot requests. Useful for:
- Filtering context data for security
- Limiting context size
- Adding additional context sources

### Pre-Commit (`pre-commit`)
Triggered before git commit operations. Useful for:
- Running linting and code quality checks
- Performing security scans
- Formatting code

### Pre-Push (`pre-push`)
Triggered before git push operations. Useful for:
- Running tests
- Performing final quality checks
- Validating commit messages

### Pre-Pull (`pre-pull`)
Triggered before git pull operations. Useful for:
- Backing up local changes
- Cleaning up temporary files
- Preparing the workspace

### Post-Copilot Response (`post-copilot-response`)
Triggered after receiving a response from Copilot. Useful for:
- Logging usage statistics
- Post-processing responses
- Implementing custom filtering

### Workspace Open (`workspace-open`)
Triggered when opening a workspace. Useful for:
- Setting up the development environment
- Installing dependencies
- Running initialization scripts

### File Save (`file-save`)
Triggered before saving files. Useful for:
- Formatting code
- Running linters
- Performing custom validation

## Configuration

### VSCode Settings

Configure hooks through VSCode settings:

```json
{
  "hooks.enabled": true,
  "hooks.timeout": 5000,
  "hooks.preCopilotPrompt": [
    {
      "script": "./scripts/preprocess-prompt.js",
      "timeout": 5000,
      "abortOnFailure": true
    }
  ],
  "hooks.preCommit": [
    {
      "script": "./hooks/lint-check.sh",
      "timeout": 10000,
      "abortOnFailure": true
    }
  ]
}
```

### Workspace Configuration

Create a `.vscode/hooks.json` file in your workspace:

```json
{
  "$schema": "vscode://schemas/hooks",
  "hooks": {
    "pre-copilot-prompt": [
      {
        "script": "./scripts/preprocess-prompt.js",
        "timeout": 5000,
        "abortOnFailure": true,
        "env": {
          "HOOK_TYPE": "pre-copilot-prompt"
        }
      }
    ],
    "pre-context-attach": [
      {
        "command": "python",
        "args": ["./security/filter-context.py", "--sanitize", "--remove-secrets"],
        "timeout": 3000,
        "abortOnFailure": true,
        "cwd": "${workspaceFolder}"
      }
    ],
    "pre-commit": [
      {
        "script": "./hooks/lint-check.sh",
        "timeout": 10000,
        "abortOnFailure": true
      },
      {
        "script": "./hooks/security-scan.js",
        "timeout": 15000,
        "abortOnFailure": false
      }
    ]
  }
}
```

## Hook Configuration Options

Each hook configuration supports the following options:

- `script`: Path to the script to execute
- `command`: Command to execute (alternative to script)
- `args`: Array of arguments to pass to the command/script
- `timeout`: Timeout in milliseconds (default: 5000)
- `abortOnFailure`: Whether to abort the action if the hook fails (default: false)
- `async`: Whether to run the hook asynchronously (default: false)
- `cwd`: Working directory for hook execution
- `env`: Environment variables to set for the hook

## Context Data

Hooks receive context data through environment variables and command-line arguments:

### Environment Variables
- `HOOK_TYPE`: The type of hook being executed
- `WORKSPACE_FOLDER`: Path to the workspace folder
- `ACTIVE_FILE`: Path to the currently active file
- `ACTIVE_LANGUAGE`: Language of the currently active file

### Context-Specific Data
- **Pre-Copilot Prompt**: Prompt text, context information
- **Pre-Context Attach**: Context data, file information
- **Pre-Commit**: List of files being committed
- **Pre-Push/Pre-Pull**: Branch information
- **File Save**: File path and content
- **Workspace Open**: Workspace path

## Example Scripts

### Preprocessing Copilot Prompts

```javascript
#!/usr/bin/env node

const prompt = process.env.COPILOT_PROMPT || process.argv[2] || '';

// Remove sensitive information
const sensitivePatterns = [
  /password\\s*[:=]\\s*['"]?[^'"\\\\s]+['"]?/gi,
  /api[_-]?key\\s*[:=]\\s*['"]?[^'"\\\\s]+['"]?/gi,
  /token\\s*[:=]\\s*['"]?[^'"\\\\s]+['"]?/gi
];

let filteredPrompt = prompt;
sensitivePatterns.forEach(pattern => {
  filteredPrompt = filteredPrompt.replace(pattern, '[REDACTED]');
});

console.log(filteredPrompt);
process.exit(0);
```

### Pre-Commit Linting

```bash
#!/bin/bash

set -e

echo "Running pre-commit hooks..."

# Run ESLint
if command -v eslint &> /dev/null && [ -f "package.json" ]; then
    echo "Running ESLint..."
    npm run lint
fi

# Run TypeScript compiler
if command -v tsc &> /dev/null && [ -f "tsconfig.json" ]; then
    echo "Running TypeScript compiler..."
    npx tsc --noEmit
fi

echo "✅ All pre-commit hooks passed!"
exit 0
```

### Context Filtering

```python
#!/usr/bin/env python3

import sys
import json
import re

def sanitize_text(text):
    patterns = [
        (r'password\\s*[:=]\\s*[\'"]?[^\'"\\\\s]+[\'"]?', '[REDACTED_PASSWORD]'),
        (r'api[_-]?key\\s*[:=]\\s*[\'"]?[^\'"\\\\s]+[\'"]?', '[REDACTED_API_KEY]'),
    ]
    
    sanitized = text
    for pattern, replacement in patterns:
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
    
    return sanitized

# Read context data
context_data = sys.stdin.read()

# Process and sanitize
try:
    data = json.loads(context_data)
    if 'selectedText' in data:
        data['selectedText'] = sanitize_text(data['selectedText'])
    print(json.dumps(data, indent=2))
except json.JSONDecodeError:
    print(sanitize_text(context_data))
```

## Security Considerations

- Hooks run with the same permissions as VSCode
- Validate all script paths and commands
- Be cautious with environment variables containing sensitive data
- Consider using timeouts to prevent hanging hooks
- Test hooks thoroughly before deploying to production

## Performance Considerations

- Keep hooks lightweight and fast
- Use appropriate timeouts
- Consider using async hooks for non-blocking operations
- Monitor hook execution times and optimize as needed

## Troubleshooting

### Common Issues

1. **Hook not executing**: Check that the script path is correct and executable
2. **Timeout errors**: Increase the timeout value or optimize the script
3. **Permission denied**: Ensure the script has executable permissions
4. **Environment variables not available**: Check that VSCode is providing the expected environment

### Debugging

Enable debug logging by setting the log level to 'trace' in VSCode settings:

```json
{
  "log.level": "trace"
}
```

Check the VSCode output panel for hook execution logs.

## Extension API

Extensions can register hooks programmatically:

```typescript
import { IHooksService, HookType } from 'vs/workbench/contrib/hooks/common/hooks';

// Register a hook
const disposable = hooksService.registerHook(HookType.PreCopilotPrompt, {
  script: './my-hook.js',
  timeout: 5000,
  abortOnFailure: true
});

// Execute hooks
const results = await hooksService.executeHooks(HookType.PreCommit, {
  hookType: HookType.PreCommit,
  workspaceUri: workspaceUri,
  data: { filePaths: ['file1.ts', 'file2.ts'] }
});

// Listen for hook execution events
hooksService.onHookExecuted(event => {
  console.log('Hook executed:', event.hookType, event.result.success);
});
```

## Contributing

To contribute to the hooks system:

1. Follow the existing code patterns and architecture
2. Add tests for new functionality
3. Update documentation
4. Ensure cross-platform compatibility
5. Consider security implications

## License

This hooks system is part of VSCode and is licensed under the MIT License.