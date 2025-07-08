#!/usr/bin/env node

/**
 * Example script for preprocessing Copilot prompts
 * This script demonstrates how to filter and modify prompts before they're sent to Copilot
 */

const process = require('process');
const fs = require('fs');
const path = require('path');

// Read prompt from environment variable or stdin
const prompt = process.env.COPILOT_PROMPT || process.argv[2] || '';

// Example: Remove sensitive information patterns
const sensitivePatterns = [
	/password\s*[:=]\s*['"]?[^'"\\s]+['"]?/gi,
	/api[_-]?key\s*[:=]\s*['"]?[^'"\\s]+['"]?/gi,
	/token\s*[:=]\s*['"]?[^'"\\s]+['"]?/gi,
	/secret\s*[:=]\s*['"]?[^'"\\s]+['"]?/gi
];

let filteredPrompt = prompt;

// Apply filters
sensitivePatterns.forEach(pattern => {
	filteredPrompt = filteredPrompt.replace(pattern, '[REDACTED]');
});

// Log the filtering action
const logFile = path.join(process.cwd(), '.vscode', 'hooks.log');
const logEntry = `${new Date().toISOString()} - Pre-Copilot Prompt: Original length: ${prompt.length}, Filtered length: ${filteredPrompt.length}\\n`;

try {
	fs.appendFileSync(logFile, logEntry);
} catch (error) {
	// Ignore logging errors
}

// Example: Add context information
const contextInfo = `
Context: ${process.env.WORKSPACE_FOLDER || 'unknown'}
File: ${process.env.ACTIVE_FILE || 'unknown'}
Language: ${process.env.ACTIVE_LANGUAGE || 'unknown'}

`;

const enhancedPrompt = contextInfo + filteredPrompt;

// Output the processed prompt
console.log(enhancedPrompt);

// Exit with success
process.exit(0);