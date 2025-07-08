#!/usr/bin/env python3

"""
Example script for filtering context before it's attached to Copilot
This script demonstrates how to sanitize context data for security
"""

import sys
import json
import re
import os
from pathlib import Path

def sanitize_text(text):
    """Remove sensitive information from text"""
    # Define sensitive patterns
    patterns = [
        (r'password\s*[:=]\s*[\'"]?[^\'"\\s]+[\'"]?', '[REDACTED_PASSWORD]'),
        (r'api[_-]?key\s*[:=]\s*[\'"]?[^\'"\\s]+[\'"]?', '[REDACTED_API_KEY]'),
        (r'token\s*[:=]\s*[\'"]?[^\'"\\s]+[\'"]?', '[REDACTED_TOKEN]'),
        (r'secret\s*[:=]\s*[\'"]?[^\'"\\s]+[\'"]?', '[REDACTED_SECRET]'),
        (r'\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', '[REDACTED_EMAIL]'),
        (r'\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', '[REDACTED_IP]'),
        (r'\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b', '[REDACTED_IP]'),
    ]
    
    sanitized = text
    for pattern, replacement in patterns:
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
    
    return sanitized

def filter_file_content(content, file_path):
    """Filter content based on file type and content"""
    # Skip binary files
    if isinstance(content, bytes):
        return '[BINARY_FILE]'
    
    # Skip very large files
    if len(content) > 50000:  # 50KB limit
        return content[:50000] + '\\n[TRUNCATED - FILE TOO LARGE]'
    
    # Skip sensitive file types
    sensitive_extensions = ['.env', '.key', '.pem', '.p12', '.pfx']
    if any(file_path.endswith(ext) for ext in sensitive_extensions):
        return '[SENSITIVE_FILE_REDACTED]'
    
    # Sanitize content
    return sanitize_text(content)

def main():
    try:
        # Read context data from stdin or command line arguments
        if len(sys.argv) > 1:
            context_data = sys.argv[1]
        else:
            context_data = sys.stdin.read()
        
        # Try to parse as JSON
        try:
            data = json.loads(context_data)
        except json.JSONDecodeError:
            # Treat as plain text
            data = context_data
        
        # Process the data
        if isinstance(data, dict):
            # Handle structured context data
            if 'files' in data:
                for file_info in data['files']:
                    if 'content' in file_info:
                        file_info['content'] = filter_file_content(
                            file_info['content'], 
                            file_info.get('path', '')
                        )
            
            if 'selectedText' in data:
                data['selectedText'] = sanitize_text(data['selectedText'])
            
            if 'prompt' in data:
                data['prompt'] = sanitize_text(data['prompt'])
        else:
            # Handle plain text data
            data = sanitize_text(str(data))
        
        # Add security notice
        security_notice = {
            'security_notice': 'This context has been processed by security filters',
            'timestamp': os.environ.get('TIMESTAMP', ''),
            'filters_applied': ['sensitive_data_removal', 'file_size_limit', 'file_type_filtering']
        }
        
        if isinstance(data, dict):
            data['__security'] = security_notice
        
        # Output the filtered data
        if isinstance(data, dict):
            print(json.dumps(data, indent=2))
        else:
            print(data)
        
        # Log the action
        log_file = Path.cwd() / '.vscode' / 'hooks.log'
        log_file.parent.mkdir(exist_ok=True)
        
        with open(log_file, 'a') as f:
            f.write(f"{os.environ.get('TIMESTAMP', 'unknown')} - Context filtered for security\\n")
    
    except Exception as e:
        print(f"Error filtering context: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()