#!/bin/bash

# Example pre-commit hook script
# This script performs linting and code quality checks before allowing commits

set -e

echo "Running pre-commit hooks..."

# Change to workspace directory
cd "${WORKSPACE_FOLDER:-$(pwd)}"

# Array to store any errors
ERRORS=()

# Run ESLint if available
if command -v eslint &> /dev/null && [ -f "package.json" ]; then
    echo "Running ESLint..."
    if ! npm run lint 2>/dev/null; then
        ERRORS+=("ESLint failed")
    fi
fi

# Run TypeScript compiler if available
if command -v tsc &> /dev/null && [ -f "tsconfig.json" ]; then
    echo "Running TypeScript compiler..."
    if ! npx tsc --noEmit; then
        ERRORS+=("TypeScript compilation failed")
    fi
fi

# Run Prettier if available
if command -v prettier &> /dev/null && [ -f ".prettierrc" ]; then
    echo "Running Prettier..."
    if ! npx prettier --check . 2>/dev/null; then
        ERRORS+=("Prettier formatting check failed")
    fi
fi

# Check for TODO/FIXME comments in staged files
if command -v git &> /dev/null; then
    echo "Checking for TODO/FIXME comments..."
    if git diff --cached --name-only | xargs grep -l "TODO\\|FIXME" 2>/dev/null; then
        echo "Warning: Found TODO/FIXME comments in staged files"
    fi
fi

# Check for console.log statements in JavaScript/TypeScript files
if command -v git &> /dev/null; then
    echo "Checking for console.log statements..."
    if git diff --cached --name-only | grep -E "\\.(js|ts|jsx|tsx)$" | xargs grep -l "console\\.log" 2>/dev/null; then
        echo "Warning: Found console.log statements in staged files"
    fi
fi

# Report errors
if [ ${#ERRORS[@]} -gt 0 ]; then
    echo "❌ Pre-commit hooks failed:"
    for error in "${ERRORS[@]}"; do
        echo "  - $error"
    done
    exit 1
fi

echo "✅ All pre-commit hooks passed!"
exit 0