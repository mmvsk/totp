# TOTP/HOTP Library

A lightweight, secure TypeScript implementation of Time-based One-Time Password (TOTP) and HMAC-based One-Time Password (HOTP) algorithms, fully compliant with RFC 6238 and RFC 4226.

## Features

- ✅ **TOTP & HOTP Support** - Full implementation of both time-based and counter-based OTP
- ✅ **Multiple Hash Algorithms** - SHA-1, SHA-256, SHA-512
- ✅ **Base32 Encoding/Decoding** - RFC 4648 compliant, case-insensitive
- ✅ **QR Code URL Generation** - Generate otpauth:// URLs for authenticator apps
- ✅ **Backup Code Generation** - Generate secure recovery codes
- ✅ **Luhn Checksum** - Utilities for credit card-style validation
- ✅ **TypeScript** - Full type safety with comprehensive JSDoc
- ✅ **Zero Dependencies** - Uses native Web Crypto API
- ✅ **Well Tested** - 89 tests with comprehensive coverage

## Installation

```bash
bun add totp
# or
npm install totp
```

## Quick Start

### Generate and Verify TOTP Codes

```typescript
import { GenerateRandomSecret, GenerateTotpCode, VerifyTotpCode } from "totp";

// Generate a random secret (10 bytes = 16 base32 chars, GitHub standard)
const secret = GenerateRandomSecret(10);
console.log("Secret:", secret); // "JBSWY3DPEHPK3PXP"

// Generate a TOTP code
const code = await GenerateTotpCode(secret);
console.log("Code:", code); // "123456"

// Verify the code
const isValid = await VerifyTotpCode(code, secret);
console.log("Valid:", isValid); // true
```

### Setup 2FA with QR Code

```typescript
import { GenerateRandomSecret, GenerateTotpUrl } from "totp";

const secret = GenerateRandomSecret(10);
const url = GenerateTotpUrl("MyApp", "user@example.com", secret);

console.log(url);
// otpauth://totp/MyApp:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MyApp

// Convert this URL to a QR code and display to the user
// They can scan it with Google Authenticator, Authy, etc.
```

### Time Skew Tolerance

```typescript
import { VerifyTotpCode, EstimateSkewAllowance } from "totp";

// Allow ±1 time window (±30 seconds with default 30s period)
const isValid = await VerifyTotpCode(code, secret, {
  allowedSkew: { left: 1, right: 1 }
});

// Smart skew: only allow skew near time window boundaries
const skew = EstimateSkewAllowance(30, 10); // period=30s, threshold=10s
const isValidSmart = await VerifyTotpCode(code, secret, { allowedSkew: skew });
```

### Generate Backup Codes

```typescript
import { GenerateBackupCodes } from "totp";

// Generate 8 backup codes, 10 bytes each, grouped by 4 chars
const codes = GenerateBackupCodes(8, 10, 4);

console.log(codes);
// [
//   "JBSW-Y3DP-EHPK-3PXP",
//   "KRUW-G4ZA-MF2G-S3LQ",
//   ...
// ]
```

## API Reference

### TOTP Functions

#### `GenerateTotpCode(secret, options?)`

Generate a Time-based One-Time Password.

**Parameters:**
- `secret: string` - Base32-encoded secret key (case-insensitive)
- `options?: object`
  - `digits?: 6 | 7 | 8 | 9 | 10` - Number of digits (default: 6)
  - `algorithm?: "SHA-1" | "SHA-256" | "SHA-512"` - Hash algorithm (default: "SHA-1")
  - `period?: number` - Time window in seconds (default: 30)

**Returns:** `Promise<string>` - The generated code

**Throws:** `InvalidSecretError` if secret is too short (< 10 bytes)

```typescript
const code = await GenerateTotpCode("JBSWY3DPEHPK3PXP");
const code8 = await GenerateTotpCode("JBSWY3DPEHPK3PXP", { digits: 8 });
const codeSHA256 = await GenerateTotpCode("JBSWY3DPEHPK3PXP", { algorithm: "SHA-256" });
```

#### `VerifyTotpCode(code, secret, options?)`

Verify a Time-based One-Time Password.

**⚠️ Important:** In production, implement rate limiting to prevent brute force attacks!

**Parameters:**
- `code: string` - The TOTP code to verify
- `secret: string` - Base32-encoded secret key
- `options?: object`
  - `digits?: 6 | 7 | 8 | 9 | 10` - Expected digits (required if `strictDigits` is true)
  - `strictDigits?: boolean` - Enforce exact digit length (default: false)
  - `algorithm?: string` - Hash algorithm (default: "SHA-1")
  - `period?: number` - Time window (default: 30)
  - `allowedSkew?: { left: number, right: number }` - Time drift tolerance

**Returns:** `Promise<boolean>` - True if valid

```typescript
const isValid = await VerifyTotpCode("123456", secret);
const isValidWithSkew = await VerifyTotpCode("123456", secret, {
  allowedSkew: { left: 1, right: 1 }
});
```

### HOTP Functions

#### `GenerateHotpCode(counter, secret, options?)`

Generate an HMAC-based One-Time Password.

**Parameters:**
- `counter: number` - Counter value (incrementing integer)
- `secret: string` - Base32-encoded secret key
- `options?: object` - Same as TOTP (digits, algorithm)

**Returns:** `Promise<string>`

```typescript
const code = await GenerateHotpCode(42, secret);
```

#### `VerifyHotpCode(code, counter, secret, options?)`

Verify an HMAC-based One-Time Password.

**Parameters:**
- `code: string` - The HOTP code to verify
- `counter: number` - Counter value
- `secret: string` - Base32-encoded secret key
- `options?: object` - Same as TOTP verification

**Returns:** `Promise<boolean>`

### Utility Functions

#### `GenerateRandomSecret(byteLength)`

Generate a cryptographically secure random secret.

**Parameters:**
- `byteLength: number` - Length in bytes (recommended: 10 or more)

**Returns:** `string` - Base32-encoded secret without padding

**Note:** Base32 encoding produces 8 characters for every 5 bytes.
- 10 bytes → 16 characters (GitHub standard)
- 20 bytes → 32 characters (extra secure)

```typescript
const secret = GenerateRandomSecret(10); // 16 chars
const longSecret = GenerateRandomSecret(20); // 32 chars
```

#### `GenerateTotpUrl(issuer, user, secret, options?)`

Generate an otpauth:// URL for QR code generation.

**Parameters:**
- `issuer: string` - Service name (e.g., "GitHub", "Google")
- `user: string` - Username or email
- `secret: string` - Base32-encoded secret
- `options?: object` - Same as TOTP generation options

**Returns:** `string` - otpauth:// URL

```typescript
const url = GenerateTotpUrl("MyApp", "user@example.com", secret, {
  digits: 8,
  period: 60,
  algorithm: "SHA-256"
});
```

#### `GenerateBackupCodes(count, byteLength, groupBy?)`

Generate multiple backup/recovery codes.

**Parameters:**
- `count: number` - Number of codes to generate
- `byteLength: number` - Length of each code in bytes
- `groupBy?: 1 | 4 | 8` - Grouping pattern (default: 1 = no grouping)

**Returns:** `string[]`

```typescript
const codes = GenerateBackupCodes(8, 10, 4);
// ["JBSW-Y3DP-EHPK-3PXP", ...]
```

#### `EstimateTimeLeft(period?)`

Get seconds remaining in current time window.

**Parameters:**
- `period?: number` - Period in seconds (default: 30)

**Returns:** `number` - Seconds until next period

```typescript
const timeLeft = EstimateTimeLeft();
console.log(`Code expires in ${timeLeft} seconds`);
```

#### `EstimateSkewAllowance(period?, threshold?)`

Estimate recommended skew based on proximity to period boundaries.

**Parameters:**
- `period?: number` - Period in seconds (default: 30)
- `threshold?: number` - Boundary threshold in seconds (default: 10)

**Returns:** `{ left: 0 | 1, right: 0 | 1 }`

```typescript
const skew = EstimateSkewAllowance(30, 10);
// Near start: { left: 1, right: 0 }
// Near end: { left: 0, right: 1 }
// Middle: { left: 0, right: 0 }
```

### Base32 Functions

#### `EncodeToBase32(bytes, withPadding?)`

Encode bytes to Base32 (RFC 4648).

**Parameters:**
- `bytes: Uint8Array` - Data to encode
- `withPadding?: boolean` - Add padding (default: true)

**Returns:** `string`

#### `DecodeBase32(base32String)`

Decode Base32 string to bytes (case-insensitive).

**Parameters:**
- `base32String: string` - Base32 string to decode

**Returns:** `Uint8Array`

**Throws:** `TypeError` if invalid characters found

### Luhn Checksum Functions

#### `CalculateLuhnChecksum(payload)`

Calculate Luhn checksum digit (used for credit cards, etc.).

**Parameters:**
- `payload: string` - String of digits

**Returns:** `number` - Checksum digit (0-9)

```typescript
const checksum = CalculateLuhnChecksum("123456"); // 6
const fullCode = "123456" + checksum; // "1234566"
```

#### `VerifyLuhnChecksum(digits)`

Verify Luhn checksum (last digit should be checksum of preceding digits).

**Parameters:**
- `digits: string` - String of digits including checksum

**Returns:** `boolean`

```typescript
const isValid = VerifyLuhnChecksum("1234566"); // true
const isInvalid = VerifyLuhnChecksum("1234567"); // false
```

## Error Types

```typescript
class TotpError extends Error {}
class InvalidSecretError extends TotpError {}
class InvalidCodeLengthError extends TotpError {}
class Base32DecodeError extends TotpError {}
```

## Security Best Practices

### Secret Storage
- **Never** store secrets in plain text
- Use encryption at rest (AES-256-GCM or similar)
- Use secure key management systems (e.g., AWS KMS, HashiCorp Vault)

### Rate Limiting
```typescript
// Example: limit verification attempts
const MAX_ATTEMPTS = 5;
const WINDOW = 60000; // 1 minute

let attempts = 0;
let windowStart = Date.now();

async function verifyWithRateLimit(code: string, secret: string) {
  if (Date.now() - windowStart > WINDOW) {
    attempts = 0;
    windowStart = Date.now();
  }

  if (attempts >= MAX_ATTEMPTS) {
    throw new Error("Too many attempts");
  }

  attempts++;
  return await VerifyTotpCode(code, secret);
}
```

### Production Checklist
- ✅ Implement rate limiting (max 5 attempts per minute recommended)
- ✅ Use HTTPS for all API endpoints
- ✅ Log failed attempts for security monitoring
- ✅ Use time skew only near period boundaries
- ✅ Validate input before processing
- ✅ Use secrets ≥ 10 bytes (16 base32 characters)
- ✅ Consider using SHA-256 or SHA-512 instead of SHA-1

## Testing

```bash
bun test
```

89 tests covering:
- TOTP generation and verification
- HOTP generation and verification
- Base32 encoding/decoding with RFC 4648 test vectors
- Luhn checksum calculation and verification
- Utility functions
- Edge cases and error handling

## Examples

See the `examples/` directory for complete working examples:
- Basic 2FA setup
- QR code generation
- Backup code management
- Production-ready verification with rate limiting

## License

MIT

## References

- [RFC 6238](https://tools.ietf.org/html/rfc6238) - TOTP: Time-Based One-Time Password Algorithm
- [RFC 4226](https://tools.ietf.org/html/rfc4226) - HOTP: An HMAC-Based One-Time Password Algorithm
- [RFC 4648](https://tools.ietf.org/html/rfc4648) - Base32 Encoding
- [Key URI Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format) - otpauth:// URI specification
