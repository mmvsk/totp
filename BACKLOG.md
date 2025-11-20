# TOTP Library Backlog

## Production Readiness: 85% Complete

---

## 🚨 Critical Issues (Must Fix Before v1.0)

### 1. Timing Attack Vulnerability
**File:** `src/totp.ts:135`
**Severity:** High
**Status:** Open

**Problem:**
```typescript
// Current implementation uses standard string comparison
if (await GenerateHotpCode(counterValues[i], secret, { ...options, digits }) === code) {
  return true;
}
```

This is vulnerable to timing attacks. Attackers can measure response times to guess codes.

**Solution:**
Implement constant-time comparison:
```typescript
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

**References:**
- https://www.chosenplaintext.ca/articles/beginners-guide-constant-time-cryptography.html
- https://codahale.com/a-lesson-in-timing-attacks/

---

### 2. Build Setup for NPM Publishing
**Status:** Missing
**Severity:** High (blocking npm publish)

**Required:**
1. Add TypeScript build to package.json:
   ```json
   "scripts": {
     "build": "tsc",
     "prepublishOnly": "bun test && bun run build"
   }
   ```

2. Add exports field:
   ```json
   "exports": {
     ".": {
       "types": "./dist/index.d.ts",
       "default": "./dist/index.js"
     },
     "./base32": {
       "types": "./dist/base32/index.d.ts",
       "default": "./dist/base32/index.js"
     }
   },
   "main": "./dist/index.js",
   "types": "./dist/index.d.ts"
   ```

3. Update tsconfig.json for declaration files:
   ```json
   {
     "compilerOptions": {
       "declaration": true,
       "outDir": "./dist"
     }
   }
   ```

4. Add to .gitignore:
   ```
   dist/
   *.tsbuildinfo
   ```

---

## ⚠️ Important (Should Fix Before v1.0)

### 3. CI/CD Pipeline
**Status:** Missing
**Priority:** High

**Tasks:**
- [ ] Add `.github/workflows/test.yml`:
  ```yaml
  name: Tests
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: oven-sh/setup-bun@v1
        - run: bun install
        - run: bun test
  ```

- [ ] Add `.github/workflows/publish.yml` for npm releases
- [ ] Add badge to README: `![Tests](https://github.com/mmvsk/totp/workflows/Tests/badge.svg)`

---

### 4. Security Documentation
**Status:** Missing
**Priority:** Medium

**Tasks:**
- [ ] Create `SECURITY.md` with vulnerability reporting instructions:
  ```markdown
  # Security Policy

  ## Reporting a Vulnerability

  Please report security vulnerabilities to: [email]

  Do not open public issues for security vulnerabilities.

  ## Supported Versions

  | Version | Supported          |
  | ------- | ------------------ |
  | 0.2.x   | :white_check_mark: |
  ```

- [ ] Document rate limiting requirements in README
- [ ] Add security best practices section

---

### 5. Secret Validation Strictness
**File:** `src/totp.ts:120-122`
**Status:** Open for discussion
**Priority:** Medium

**Current:** Minimum 10 bytes (80 bits)
**RFC Recommendation:** 16 bytes (128 bits)

**Discussion:**
- 10 bytes is common (GitHub uses it)
- 16 bytes is more secure
- Should we make it configurable?
- Should we warn instead of error for 10-15 bytes?

**Possible solutions:**
1. Keep current (10 bytes minimum)
2. Increase to 16 bytes minimum
3. Add warning for 10-15 bytes, error for <10
4. Make configurable via options

---

### 6. Missing Project Files
**Status:** Missing
**Priority:** Low

**Tasks:**
- [ ] Add `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/)
- [ ] Add `CONTRIBUTING.md` with contribution guidelines
- [ ] Add `.npmignore` or ensure `files` field in package.json
- [ ] Add funding info (optional): `"funding": "https://github.com/sponsors/mmvsk"`

---

## 💡 Enhancements (Post v1.0)

### 7. Base32 Implementation Review
**Status:** Enhancement
**Priority:** Low

**Current state:**
- Two implementations: `for-short.ts` and `for-long.ts`
- `for-long.ts` is used by default
- Comment says for-short is faster for <5 bytes but overhead isn't worth it

**Options:**
1. **Remove for-short.ts** (simpler maintenance, less code)
2. **Keep both** (document benchmark results showing why)
3. **Make switchable** via option (probably overkill)

**Recommendation:** Remove for-short.ts unless benchmarks show significant difference

---

### 8. Performance Benchmarks Documentation
**Status:** Enhancement
**Priority:** Low

**Tasks:**
- [ ] Add benchmark script: `bun run bench`
- [ ] Document performance characteristics in README:
  - Codes/second for generation
  - Verification time
  - Memory usage
- [ ] Compare with other popular libraries (`otplib`, `speakeasy`)

---

### 9. Browser/Node.js Compatibility Matrix
**Status:** Enhancement
**Priority:** Low

**Tasks:**
- [ ] Test in browsers (Web Crypto API availability)
- [ ] Document Node.js version requirements
- [ ] Add browser build if needed
- [ ] Document any polyfill requirements

---

### 10. Rate Limiting Built-in Option
**Status:** Enhancement
**Priority:** Low

**Current:** Only documented/shown in examples

**Possible enhancement:**
```typescript
const rateLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 60000,
  lockoutMs: 300000,
});

await VerifyTotpCode(code, secret, {
  rateLimiter: rateLimiter,
  userId: "user123",
});
```

**Note:** Might be better as separate package to avoid complexity

---

### 11. Bundle Size Optimization
**Status:** Enhancement
**Priority:** Low

**Tasks:**
- [ ] Measure current bundle size
- [ ] Add tree-shaking support
- [ ] Consider splitting exports (totp, hotp, utilities)
- [ ] Add size badge to README

---

### 12. Additional Hash Algorithms
**Status:** Enhancement
**Priority:** Low

**Current:** SHA-1, SHA-256, SHA-512

**Possible additions:**
- SHA-384
- SHA-3 variants

**Discussion:** Probably not needed, current three cover all real-world use cases

---

## 🎨 Nice to Have (Future)

### 13. HOTP Auto-increment
**Status:** Idea
**Priority:** Very Low

Add helper to manage HOTP counter state:
```typescript
const hotpManager = createHotpManager(secret);
const code1 = await hotpManager.generate(); // counter=0
const code2 = await hotpManager.generate(); // counter=1
```

---

### 14. QR Code Generation Built-in
**Status:** Idea
**Priority:** Very Low

Currently shown in examples with `qrcode` package. Could integrate directly as optional dependency.

**Pros:** Better DX, one-stop-shop
**Cons:** Increases bundle size, adds dependency

**Verdict:** Better to keep as example (users can choose QR library)

---

### 15. Secret Storage Helpers
**Status:** Idea
**Priority:** Very Low

Add helpers for secure secret storage:
```typescript
import { encrypt, decrypt } from "totp/storage";

const encrypted = await encrypt(secret, masterKey);
// Store encrypted in database

const secret = await decrypt(encrypted, masterKey);
```

**Verdict:** Too opinionated, users should handle this themselves

---

## 📋 Implementation Quality Review

### TOTP/HOTP Implementation: ✅ Excellent (9/10)
- **Dynamic truncation:** Correct
- **Counter encoding:** Correct (big-endian)
- **HMAC usage:** Correct
- **Issue:** Timing attack (see #1)

### Base32 Implementation: ✅ Good (8/10)
- **for-short.ts:** Clean, standard implementation
- **for-long.ts:** More complex but passes RFC 4648 test vectors
- **Validation:** Properly handles invalid characters
- **See:** Enhancement #8 for simplification

---

## 📊 Current Status Summary

| Category | Score | Notes |
|----------|-------|-------|
| Core Implementation | 9/10 | Fix timing attack |
| Test Coverage | 9/10 | 89 tests, good coverage |
| Documentation | 8/10 | Excellent but missing security docs |
| Build Setup | 3/10 | Missing npm build |
| Security | 6/10 | Timing attack vulnerability |
| API Design | 7/10 | Good but Luhn is questionable |
| **Overall** | **8.5/10** | Almost production-ready |

---

## 🚀 v1.0 Release Checklist

### Must Complete:
- [ ] Fix timing attack vulnerability (#1)
- [ ] Add build setup (#2)
- [ ] Decide on Luhn module (#3)
- [ ] Add CI/CD (#4)
- [ ] Add SECURITY.md (#5)

### Should Complete:
- [ ] Review secret validation strictness (#6)
- [ ] Add CHANGELOG.md (#7)
- [ ] Add CONTRIBUTING.md (#7)

### Post v1.0:
- Everything else in this backlog

---

## 📝 Notes

**Package Naming:**
Current name "totp" is fine. Base32 is essential for TOTP, so re-exporting makes sense.

**Alternative names considered:**
- `@mmvsk/totp` (scoped, recommended for npm)
- `otp` (broader, includes HOTP emphasis)
- `totp-utils` (indicates utilities included)

**Verdict:** Consider publishing as `@mmvsk/totp` for better npm namespacing.

---

**Last Updated:** 2025-01-20
**Version:** 0.2.0
**Maintainer:** Max Ruman
