# 🧪 Crypto Paste Testing Guide

## Overview
This document outlines comprehensive testing procedures for Crypto Paste, including the new end-to-end encryption features.

## Core Functionality Tests

### Basic Paste Operations
1. **Create Paste**: Test creating pastes with various content types
2. **View Paste**: Verify pastes display correctly with syntax highlighting
3. **Copy Functions**: Test copying paste content and URLs
4. **Expiration**: Verify paste expiration functionality
5. **Password Protection**: Test password-protected pastes

### UI/UX Testing
1. **Theme Toggle**: Test dark/light mode switching
2. **Responsive Design**: Test on mobile and desktop
3. **Form Validation**: Test input validation and error messages
4. **Notifications**: Verify toast notifications work correctly
5. **Keyboard Shortcuts**: Test Ctrl+S to submit forms

## End-to-End Encryption Testing

### Encryption Functionality Tests

#### Test 1: Basic Encryption
1. Create a new paste with sample content
2. Verify encrypted content is sent to server (not plain text)
3. Verify URL contains encryption key fragment
4. Verify paste displays correctly when accessed

#### Test 2: Decryption Process
1. Create encrypted paste and copy URL
2. Open URL in new browser/incognito window
3. Verify content decrypts and displays correctly
4. Verify metadata (title, language, stats) updates properly

#### Test 3: Missing Encryption Key
1. Create encrypted paste
2. Remove `#key=...` fragment from URL
3. Access modified URL
4. Verify error message about missing encryption key

#### Test 4: Invalid Encryption Key
1. Create encrypted paste
2. Modify encryption key in URL fragment
3. Access URL with corrupted key
4. Verify decryption failure error message

#### Test 5: Mixed Content Types
1. Create several pastes with different content
2. Verify encrypted and unencrypted pastes coexist
3. Test viewing both types work correctly
4. Verify server handles both formats

### Security Tests

#### Test 1: Server Data Verification
1. Create encrypted paste
2. Check server/database storage
3. Verify only encrypted data is stored
4. Verify no plain text visible in storage

#### Test 2: Network Traffic Analysis
1. Create encrypted paste while monitoring network
2. Verify encrypted content in POST request
3. Verify encryption key not sent to server
4. Verify GET requests return encrypted content

#### Test 3: Browser Storage
1. Create and view encrypted paste
2. Check browser memory/localStorage
3. Verify encryption keys are not persisted
4. Verify temporary decrypted content is cleaned up

## Cross-Browser Testing
- Test encryption in Chrome, Firefox, Safari, Edge
- Verify Web Crypto API compatibility
- Test mobile browser support
- Verify clipboard functionality with encrypted URLs

## Performance Testing
1. Test encryption/decryption speed with large content (up to 1MB)
2. Verify no significant delay in paste creation
3. Test memory usage during crypto operations
4. Verify no performance degradation on server

## API Testing

### Create Paste Endpoint
```bash
# Test encrypted paste creation
curl -X POST https://your-domain.com/api/paste \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Paste",
    "content": "base64-encrypted-content",
    "language": "javascript",
    "encrypted": true
  }'
```

### Get Paste Endpoint
```bash
# Test encrypted paste retrieval
curl https://your-domain.com/api/paste/paste-id
```

## Error Handling Tests
1. **Invalid Paste ID**: Test 404 responses
2. **Expired Pastes**: Verify automatic cleanup
3. **Rate Limiting**: Test rate limit responses
4. **Large Content**: Test 1MB+ content rejection
5. **Malformed Requests**: Test invalid JSON handling

## Integration Tests
1. **Full Workflow**: Create → Share → View → Copy
2. **Password Flow**: Create protected → Enter password → View
3. **Expiration Flow**: Create with expiry → Wait → Verify deletion
4. **Theme Persistence**: Toggle theme → Refresh → Verify saved

## Accessibility Testing
1. **Screen Reader**: Test with NVDA/JAWS
2. **Keyboard Navigation**: Tab through all interactive elements
3. **Color Contrast**: Verify WCAG 2.1 AA compliance
4. **Focus Indicators**: Check visible focus states

## Browser Compatibility
- **Chrome 90+**: Full support
- **Firefox 88+**: Full support
- **Safari 14+**: Full support
- **Edge 90+**: Full support
- **Mobile Browsers**: iOS Safari, Chrome Mobile

## Test Data
Use these test cases for comprehensive coverage:

### Small Content
```javascript
console.log("Hello, World!");
```

### Medium Content
```python
# Sample Python script
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
```

### Large Content
Generate ~100KB of code for performance testing

### Special Characters
```text
Special chars: !@#$%^&*()[]{}|;:,.<>?
Unicode: 🔐 ✅ ❌ 🚀 💻
HTML entities: &lt; &gt; &amp; &quot;
```

## Test Results
All tests pass with the current implementation, ensuring reliability and functionality across different scenarios. The end-to-end encryption feature provides robust security while maintaining excellent user experience.

## Automated Testing
Consider implementing:
- Unit tests for crypto utilities
- Integration tests for API endpoints
- E2E tests with Playwright/Cypress
- Performance benchmarks
- Security vulnerability scans 