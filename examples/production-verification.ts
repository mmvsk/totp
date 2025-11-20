/**
 * Production-Ready TOTP Verification
 *
 * This example demonstrates a production-ready verification system with:
 * - Rate limiting
 * - Logging
 * - Smart time skew
 * - Error handling
 */

import {
	VerifyTotpCode,
	EstimateSkewAllowance,
	EstimateTimeLeft,
	InvalidCodeLengthError,
} from "../src";

// Rate limiting configuration
const RATE_LIMIT = {
	MAX_ATTEMPTS: 5,
	WINDOW_MS: 60000, // 1 minute
	LOCKOUT_MS: 300000, // 5 minutes after max attempts
};

// In-memory storage (use Redis/database in production)
interface AttemptRecord {
	count: number;
	windowStart: number;
	lockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();

class RateLimitError extends Error {
	constructor(
		message: string,
		public remainingTime: number
	) {
		super(message);
		this.name = "RateLimitError";
	}
}

/**
 * Check if user is rate limited
 */
function checkRateLimit(userId: string): void {
	const now = Date.now();
	const record = attempts.get(userId);

	if (!record) {
		// First attempt
		attempts.set(userId, {
			count: 1,
			windowStart: now,
			lockedUntil: 0,
		});
		return;
	}

	// Check if locked out
	if (record.lockedUntil > now) {
		const remainingMs = record.lockedUntil - now;
		throw new RateLimitError(
			`Too many attempts. Try again in ${Math.ceil(remainingMs / 1000)} seconds`,
			remainingMs
		);
	}

	// Reset window if expired
	if (now - record.windowStart > RATE_LIMIT.WINDOW_MS) {
		record.count = 1;
		record.windowStart = now;
		record.lockedUntil = 0;
		return;
	}

	// Increment attempts
	record.count++;

	// Lock out if max attempts reached
	if (record.count > RATE_LIMIT.MAX_ATTEMPTS) {
		record.lockedUntil = now + RATE_LIMIT.LOCKOUT_MS;
		throw new RateLimitError(
			`Too many attempts. Locked out for ${RATE_LIMIT.LOCKOUT_MS / 1000} seconds`,
			RATE_LIMIT.LOCKOUT_MS
		);
	}
}

/**
 * Reset rate limit for user (e.g., after successful verification)
 */
function resetRateLimit(userId: string): void {
	attempts.delete(userId);
}

/**
 * Get remaining attempts for user
 */
function getRemainingAttempts(userId: string): number {
	const record = attempts.get(userId);
	if (!record) return RATE_LIMIT.MAX_ATTEMPTS;

	const now = Date.now();
	if (now - record.windowStart > RATE_LIMIT.WINDOW_MS) {
		return RATE_LIMIT.MAX_ATTEMPTS;
	}

	return Math.max(0, RATE_LIMIT.MAX_ATTEMPTS - record.count);
}

/**
 * Production-ready TOTP verification
 */
async function verifyUserCode(
	userId: string,
	code: string,
	secret: string
): Promise<{ success: boolean; message: string; remainingAttempts?: number }> {
	try {
		// Step 1: Rate limiting
		checkRateLimit(userId);

		// Step 2: Input validation
		if (!code || !/^\d{6,10}$/.test(code)) {
			logAttempt(userId, false, "Invalid code format");
			return {
				success: false,
				message: "Invalid code format",
				remainingAttempts: getRemainingAttempts(userId),
			};
		}

		// Step 3: Smart time skew (only near boundaries)
		const skew = EstimateSkewAllowance(30, 10);
		const timeLeft = EstimateTimeLeft(30);

		// Step 4: Verify code
		const isValid = await VerifyTotpCode(code, secret, {
			allowedSkew: skew,
		});

		// Step 5: Handle result
		if (isValid) {
			resetRateLimit(userId);
			logAttempt(userId, true, "Success");

			return {
				success: true,
				message: "Code verified successfully",
			};
		} else {
			logAttempt(userId, false, "Invalid code");

			return {
				success: false,
				message: "Invalid code",
				remainingAttempts: getRemainingAttempts(userId),
			};
		}
	} catch (error) {
		if (error instanceof RateLimitError) {
			logAttempt(userId, false, "Rate limited");
			return {
				success: false,
				message: error.message,
				remainingAttempts: 0,
			};
		}

		if (error instanceof InvalidCodeLengthError) {
			logAttempt(userId, false, "Invalid code length");
			return {
				success: false,
				message: "Invalid code",
				remainingAttempts: getRemainingAttempts(userId),
			};
		}

		// Unexpected error
		console.error("TOTP verification error:", error);
		logAttempt(userId, false, "System error");

		return {
			success: false,
			message: "Verification failed. Please try again.",
			remainingAttempts: getRemainingAttempts(userId),
		};
	}
}

/**
 * Log verification attempts for security monitoring
 */
function logAttempt(userId: string, success: boolean, reason: string): void {
	const timestamp = new Date().toISOString();
	const status = success ? "SUCCESS" : "FAILURE";

	// In production, send to logging service (e.g., CloudWatch, Datadog)
	console.log(`[${timestamp}] ${status} - User: ${userId}, Reason: ${reason}`);

	// Alert on suspicious activity
	const record = attempts.get(userId);
	if (record && record.count >= RATE_LIMIT.MAX_ATTEMPTS - 1) {
		console.warn(`[SECURITY] User ${userId} approaching rate limit`);
	}
}

// Example usage
console.log("=== Production TOTP Verification Example ===\n");

const testUserId = "user123";
const testSecret = "JBSWY3DPEHPK3PXP";

// Simulate multiple attempts
console.log("Simulating verification attempts:\n");

// Attempt 1: Invalid code
let result = await verifyUserCode(testUserId, "000000", testSecret);
console.log(`Attempt 1: ${result.message}`);
console.log(`Remaining attempts: ${result.remainingAttempts}\n`);

// Attempt 2-5: More invalid codes
for (let i = 2; i <= 5; i++) {
	result = await verifyUserCode(testUserId, "000000", testSecret);
	console.log(`Attempt ${i}: ${result.message}`);
	console.log(`Remaining attempts: ${result.remainingAttempts}\n`);
}

// Attempt 6: Rate limited
result = await verifyUserCode(testUserId, "000000", testSecret);
console.log(`Attempt 6: ${result.message}`);
console.log(`Remaining attempts: ${result.remainingAttempts}\n`);

console.log("=== Key Features ===\n");
console.log("✓ Rate limiting (5 attempts per minute)");
console.log("✓ Lockout after max attempts (5 minutes)");
console.log("✓ Smart time skew (only near period boundaries)");
console.log("✓ Security logging");
console.log("✓ Input validation");
console.log("✓ Graceful error handling");
console.log("✓ Attempt counter feedback");
