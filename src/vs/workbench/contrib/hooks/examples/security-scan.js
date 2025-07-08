#!/usr/bin/env node

/**
 * Example security scan hook for pre-commit
 * This script demonstrates how to perform security checks before allowing commits
 */

const fs = require('fs');
const path = require('path');
const process = require('process');

// Configuration
const config = {
  // Patterns to search for in code
  securityPatterns: [
    {
      pattern: /password\s*[:=]\s*['"](?!.*\*{3,})[^'"\\s]{3,}['"]?/gi,
      message: 'Hardcoded password detected',
      severity: 'high'
    },
    {
      pattern: /api[_-]?key\s*[:=]\s*['"](?!.*\*{3,})[^'"\\s]{10,}['"]?/gi,
      message: 'API key detected',
      severity: 'high'
    },
    {
      pattern: /secret[_-]?key\s*[:=]\s*['"](?!.*\*{3,})[^'"\\s]{10,}['"]?/gi,
      message: 'Secret key detected',
      severity: 'high'
    },
    {
      pattern: /token\s*[:=]\s*['"](?!.*\*{3,})[^'"\\s]{20,}['"]?/gi,
      message: 'Authentication token detected',
      severity: 'high'
    },
    {
      pattern: /console\\.log\\s*\\(/gi,
      message: 'Console.log statement found',
      severity: 'low'
    },
    {
      pattern: /debugger\\s*;/gi,
      message: 'Debugger statement found',
      severity: 'medium'
    },
    {
      pattern: /TODO|FIXME|HACK/gi,
      message: 'TODO/FIXME/HACK comment found',
      severity: 'low'
    }
  ],
  
  // File extensions to scan
  scanExtensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.php', '.rb', '.go'],
  
  // Directories to skip
  skipDirectories: ['node_modules', '.git', 'dist', 'build', '.vscode', 'coverage'],
  
  // Maximum file size to scan (in bytes)
  maxFileSize: 1024 * 1024 // 1MB
};

class SecurityScanner {
  constructor() {
    this.issues = [];
    this.scannedFiles = 0;
    this.startTime = Date.now();
  }

  async scanFiles(filePaths) {
    console.log(`🔍 Starting security scan on ${filePaths.length} files...`);
    
    for (const filePath of filePaths) {
      try {
        await this.scanFile(filePath);
      } catch (error) {
        console.error(`❌ Error scanning ${filePath}:`, error.message);
      }
    }
  }

  async scanFile(filePath) {
    // Skip if file doesn't have a scannable extension
    const ext = path.extname(filePath);
    if (!config.scanExtensions.includes(ext)) {
      return;
    }

    // Skip if file is in a skipped directory
    if (config.skipDirectories.some(dir => filePath.includes(dir))) {
      return;
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > config.maxFileSize) {
      console.warn(`⚠️  Skipping ${filePath} - file too large (${stats.size} bytes)`);
      return;
    }

    // Read and scan file content
    const content = fs.readFileSync(filePath, 'utf8');
    this.scannedFiles++;

    // Apply security patterns
    for (const { pattern, message, severity } of config.securityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        // Find line numbers for each match
        const lines = content.split('\\n');
        matches.forEach(match => {
          const lineNumber = this.findLineNumber(lines, match);
          this.issues.push({
            file: filePath,
            line: lineNumber,
            message,
            severity,
            match: match.substring(0, 100) // Limit match length
          });
        });
      }
    }
  }

  findLineNumber(lines, match) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(match)) {
        return i + 1;
      }
    }
    return 1;
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    
    console.log(`\\n📊 Security Scan Report`);
    console.log(`📁 Files scanned: ${this.scannedFiles}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🔍 Issues found: ${this.issues.length}`);

    if (this.issues.length === 0) {
      console.log(`✅ No security issues detected!`);
      return true;
    }

    // Group issues by severity
    const groupedIssues = this.groupBySeverity();
    
    // Display issues by severity
    ['high', 'medium', 'low'].forEach(severity => {
      const issues = groupedIssues[severity] || [];
      if (issues.length > 0) {
        console.log(`\\n${this.getSeverityIcon(severity)} ${severity.toUpperCase()} SEVERITY (${issues.length} issues):`);
        issues.forEach(issue => {
          console.log(`  📄 ${issue.file}:${issue.line} - ${issue.message}`);
          console.log(`     ${issue.match}`);
        });
      }
    });

    // Check if we should fail the commit
    const highSeverityIssues = groupedIssues.high || [];
    if (highSeverityIssues.length > 0) {
      console.log(`\\n❌ Commit blocked due to ${highSeverityIssues.length} high severity security issues!`);
      return false;
    }

    const mediumSeverityIssues = groupedIssues.medium || [];
    if (mediumSeverityIssues.length > 0) {
      console.log(`\\n⚠️  Found ${mediumSeverityIssues.length} medium severity issues. Please review.`);
    }

    return true;
  }

  groupBySeverity() {
    return this.issues.reduce((groups, issue) => {
      const severity = issue.severity;
      if (!groups[severity]) {
        groups[severity] = [];
      }
      groups[severity].push(issue);
      return groups;
    }, {});
  }

  getSeverityIcon(severity) {
    switch (severity) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return '💡';
      default: return '🔍';
    }
  }
}

async function main() {
  try {
    // Get files to scan from command line arguments or environment
    const filePaths = process.argv.slice(2);
    
    if (filePaths.length === 0) {
      console.log('Usage: node security-scan.js <file1> [file2] ...');
      console.log('   or: Set HOOK_FILES environment variable');
      process.exit(1);
    }

    // Initialize scanner
    const scanner = new SecurityScanner();
    
    // Scan files
    await scanner.scanFiles(filePaths);
    
    // Generate report and determine exit code
    const passed = scanner.generateReport();
    
    // Log to file if requested
    if (process.env.HOOK_LOG_FILE) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        hookType: 'pre-commit',
        scanner: 'security-scan',
        filesScanned: scanner.scannedFiles,
        issuesFound: scanner.issues.length,
        result: passed ? 'passed' : 'failed'
      };
      
      try {
        fs.appendFileSync(process.env.HOOK_LOG_FILE, JSON.stringify(logEntry) + '\\n');
      } catch (error) {
        console.warn('⚠️  Could not write to log file:', error.message);
      }
    }

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Security scan failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}