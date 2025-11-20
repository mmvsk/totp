import { EncodeToBase32, DecodeBase32 } from "@/base32";


/* types and defaults
 * -------------------------------------------------------------------------- */

type LongInt = number;
type Base32String = string;
type DigitsString = `${number}`;
type Seconds = number;

export type DigitsLength = 6 | 7 | 8 | 9 | 10; // but only 6 and 8 may work
export type Algorithm = (
	| "SHA-1"
	| "SHA-256"
	| "SHA-512"
);

export const DefaultAlgorithm = "SHA-1" satisfies Algorithm;
export const DefaultDigits = 6 satisfies DigitsLength;
export const DefaultPeriod = 30;


/* custom errors
 * -------------------------------------------------------------------------- */

export class TotpError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TotpError";
	}
}

export class InvalidSecretError extends TotpError {
	constructor(message: string = "Invalid or weak secret key") {
		super(message);
		this.name = "InvalidSecretError";
	}
}

export class InvalidCodeLengthError extends TotpError {
	constructor(message: string = "Invalid code length") {
		super(message);
		this.name = "InvalidCodeLengthError";
	}
}

export class Base32DecodeError extends TotpError {
	constructor(message: string = "Failed to decode base32 string") {
		super(message);
		this.name = "Base32DecodeError";
	}
}


/* TOTP
 * -------------------------------------------------------------------------- */

type TotpGenerationOptions = HotpGenerationOptions & Readonly<{
	period?: Seconds;
}>;

type TotpVerificationOptions = (
	& HotpVerificationOptions
	& TotpGenerationOptions
);


/**
 * Generate a Time-based One-Time Password (TOTP) code.
 *
 * @param {Base32String} secret - The base32-encoded secret key (case-insensitive)
 * @param {TotpGenerationOptions} options - Optional configuration
 * @param {DigitsLength} options.digits - Number of digits in the code (default: 6)
 * @param {Algorithm} options.algorithm - HMAC algorithm to use (default: "SHA-1")
 * @param {Seconds} options.period - Time window in seconds (default: 30)
 * @returns {Promise<DigitsString>} The generated TOTP code
 * @throws {InvalidSecretError} If the secret is too short (< 10 bytes)
 * @throws {Base32DecodeError} If the secret cannot be decoded
 *
 * @example
 * const code = await GenerateTotpCode("JBSWY3DPEHPK3PXP");
 * console.log(code); // "123456"
 */
export async function GenerateTotpCode(
	secret: Base32String,
	options?: TotpGenerationOptions
):
	Promise<DigitsString>
{
	const period = options?.period ?? DefaultPeriod;
	const counter = Math.floor(GetSystemTime() / period);
	return await GenerateHotpCode(counter, secret, options);
}


/**
 * Verify a Time-based One-Time Password (TOTP) code.
 *
 * IMPORTANT: In production, implement rate limiting to prevent brute force attacks.
 * This function will try multiple counter values if allowedSkew is specified.
 *
 * @param {string} code - The TOTP code to verify
 * @param {Base32String} secret - The base32-encoded secret key (case-insensitive)
 * @param {TotpVerificationOptions} options - Optional configuration
 * @param {DigitsLength} options.digits - Expected number of digits (required if strictDigits is true)
 * @param {boolean} options.strictDigits - Enforce exact digit length (default: false)
 * @param {Algorithm} options.algorithm - HMAC algorithm to use (default: "SHA-1")
 * @param {Seconds} options.period - Time window in seconds (default: 30)
 * @param {object} options.allowedSkew - Allow time drift tolerance
 * @param {number} options.allowedSkew.left - Number of past periods to check
 * @param {number} options.allowedSkew.right - Number of future periods to check
 * @returns {Promise<boolean>} True if the code is valid, false otherwise
 * @throws {InvalidCodeLengthError} If code length is invalid
 * @throws {InvalidSecretError} If the secret is too short (< 10 bytes)
 *
 * @example
 * const isValid = await VerifyTotpCode("123456", "JBSWY3DPEHPK3PXP", {
 *   allowedSkew: { left: 1, right: 1 }
 * });
 */
export async function VerifyTotpCode(
	code: DigitsString | string,
	secret: Base32String,
	options?: TotpVerificationOptions
): Promise<boolean> {
	const period = options?.period ?? DefaultPeriod;
	const counter = Math.floor(GetSystemTime() / period);
	return await VerifyHotpCode(code, counter, secret, options);
}


/* HOTP
 * -------------------------------------------------------------------------- */

type HotpGenerationOptions = Readonly<{
	digits?: DigitsLength;
	algorithm?: Algorithm;
}>;

type HotpVerificationOptions = HotpGenerationOptions & Readonly<{
	strictDigits?: boolean; // default false
	allowedSkew?: { left: number, right: number };
}>;


/**
 * Generate an HMAC-based One-Time Password (HOTP) code.
 *
 * @param {number} counter - The counter value (incrementing integer)
 * @param {Base32String} secret - The base32-encoded secret key (case-insensitive)
 * @param {HotpGenerationOptions} options - Optional configuration
 * @param {DigitsLength} options.digits - Number of digits in the code (default: 6)
 * @param {Algorithm} options.algorithm - HMAC algorithm to use (default: "SHA-1")
 * @returns {Promise<DigitsString>} The generated HOTP code
 * @throws {InvalidSecretError} If the secret is too short (< 10 bytes)
 * @throws {Base32DecodeError} If the secret cannot be decoded
 *
 * @example
 * const code = await GenerateHotpCode(42, "JBSWY3DPEHPK3PXP");
 * console.log(code); // "123456"
 */
export async function GenerateHotpCode(
	counter: LongInt,
	secret: Base32String,
	options?: HotpGenerationOptions
):
	Promise<DigitsString>
{
	const digits = options?.digits ?? DefaultDigits;
	const algorithm = options?.algorithm ?? DefaultAlgorithm;
	const counterState = GetCounterState(counter);

	const keyBytes = DecodeBase32(secret);

	// Validate secret length (minimum 10 bytes / 16 chars recommended)
	if (keyBytes.length < 10) {
		throw new InvalidSecretError(`Secret too short: ${keyBytes.length} bytes (minimum 10 bytes recommended for security)`);
	}

	const hashBytes = await HashCounterState(counterState, keyBytes, algorithm);

	const offset = hashBytes[hashBytes.length - 1]! & 0xf;
	const fullCode = (0
		| ((hashBytes[offset + 0]! & 0x7f) << 24)
		| ((hashBytes[offset + 1]! & 0xff) << 16)
		| ((hashBytes[offset + 2]! & 0xff) << 8)
		| (hashBytes[offset + 3]! & 0xff)
	);

	const code = fullCode.toString(10).slice(-digits).padStart(digits, "0");

	return code as DigitsString;
};


/**
 * Verify an HMAC-based One-Time Password (HOTP) code.
 *
 * IMPORTANT: In production, implement rate limiting to prevent brute force attacks.
 * This function will try multiple counter values if allowedSkew is specified.
 *
 * @param {string} code - The HOTP code to verify
 * @param {number} counter - The counter value to verify against
 * @param {Base32String} secret - The base32-encoded secret key (case-insensitive)
 * @param {HotpVerificationOptions} options - Optional configuration
 * @param {DigitsLength} options.digits - Expected number of digits (required if strictDigits is true)
 * @param {boolean} options.strictDigits - Enforce exact digit length (default: false)
 * @param {Algorithm} options.algorithm - HMAC algorithm to use (default: "SHA-1")
 * @param {object} options.allowedSkew - Allow counter drift tolerance
 * @param {number} options.allowedSkew.left - Number of past counters to check
 * @param {number} options.allowedSkew.right - Number of future counters to check
 * @returns {Promise<boolean>} True if the code is valid, false otherwise
 * @throws {InvalidCodeLengthError} If code length is invalid
 * @throws {InvalidSecretError} If the secret is too short (< 10 bytes)
 *
 * @example
 * const isValid = await VerifyHotpCode("123456", 42, "JBSWY3DPEHPK3PXP");
 */
export async function VerifyHotpCode(
	code: DigitsString | string,
	counter: LongInt,
	secret: Base32String,
	options?: HotpVerificationOptions
): Promise<boolean> {
	if (code.length < 6 || code.length > 10) {
		throw new InvalidCodeLengthError(`Code length must be between 6 and 10 digits, got ${code.length}`);
	}

	const digits = code.length as DigitsLength;

	if (options?.strictDigits) {
		if (!options.digits) {
			throw new InvalidCodeLengthError("strictDigits option requires specifying expected digits length");
		}

		if (code.length !== options.digits) {
			return false;
		}
	}

	const allowedSkew = options?.allowedSkew;

	const counterValues = (
		!allowedSkew ? [counter] : [counter, ...InterleaveArrays(
			[...Array(allowedSkew.left).keys()].map(i => counter - (i + 1)),
			[...Array(allowedSkew.right).keys()].map(i => counter + (i + 1)),
		)]
	);

	for (let i = 0; i < counterValues.length; i++) {
		const generatedCode = await GenerateHotpCode(counterValues[i]!, secret, { ...options, digits });
		if (timingSafeEqual(generatedCode, code)) {
			return true;
		}
	}

	return false;
};


/* utilities
 * -------------------------------------------------------------------------- */

/**
 * Generate a random base32-encoded secret key.
 *
 * @param {number} byteLength - Length of the secret in bytes (recommended: 10 or more)
 * @returns {Base32String} Base32-encoded secret key without padding
 *
 * @note Base32 encoding produces 8 characters for each 5 bytes of key
 * @note A good value is 10 bytes (16 chars), as GitHub uses in 2024
 *
 * @example
 * const secret = GenerateRandomSecret(10); // 16 chars
 * console.log(secret); // "JBSWY3DPEHPK3PXP"
 */
export function GenerateRandomSecret(byteLength: number): Base32String {
	const secretBytes = crypto.getRandomValues(new Uint8Array(byteLength));
	return EncodeToBase32(secretBytes, false);
};


/**
 * Generate a TOTP URL for QR code generation (otpauth:// URI scheme).
 * This URL can be converted to a QR code and scanned by authenticator apps.
 *
 * @param {string} issuer - Service name (e.g., "GitHub", "Google")
 * @param {string} user - Username or email
 * @param {Base32String} secret - Base32-encoded secret key
 * @param {object} options - Optional configuration
 * @param {DigitsLength} options.digits - Number of digits (default: 6)
 * @param {Seconds} options.period - Time window in seconds (default: 30)
 * @param {Algorithm} options.algorithm - HMAC algorithm (default: "SHA-1")
 * @returns {string} otpauth:// URL suitable for QR code generation
 *
 * @example
 * const url = GenerateTotpUrl("GitHub", "user@example.com", "JBSWY3DPEHPK3PXP");
 * // otpauth://totp/GitHub:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub
 */
export function GenerateTotpUrl(
	issuer: string,
	user: string,
	secret: Base32String,
	options?: Readonly<{
		digits?: DigitsLength;
		period?: Seconds;
		algorithm?: Algorithm;
	}>
): string {
	const encodedIssuer = encodeURIComponent(issuer);
	const encodedAccount = encodeURIComponent(`${issuer}:${user}`);

	const algorithmOption = options?.algorithm ? `&algorithm=${options.algorithm.replace(/-/g, "")}` : "";
	const digitsOption = options?.digits ? `&digits=${options.digits}` : "";
	const periodOption = options?.period ? `&period=${options.period}` : "";

	return (
		`otpauth://totp/${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}`
		+ algorithmOption
		+ digitsOption
		+ periodOption
	);
}


/**
 * Generate multiple backup/recovery codes (paper codes).
 *
 * @param {number} count - Number of backup codes to generate
 * @param {number} byteLength - Length of each code in bytes
 * @param {1 | 4 | 8} groupBy - Group characters with dashes (1 = no grouping, 4 = "AAAA-BBBB", 8 = "AAAABBBB-CCCCDDDD")
 * @returns {string[]} Array of backup codes
 *
 * @note Base32 encoding produces 8 characters for each 5 bytes
 * @note Common pattern: 10 bytes with groupBy=4 produces "AAAA-BBBB-CCCC-DDDD"
 *
 * @example
 * const codes = GenerateBackupCodes(8, 10, 4);
 * // ["JBSW-Y3DP-EHPK-3PXP", "KRUW-G4ZA-MF2G-S3LQ", ...]
 */
export function GenerateBackupCodes(count: number, byteLength: number, groupBy: 1 | 4 | 8 = 1): string[] {
	return [...Array(count)].map(() => GenerateSingleBackupCode(byteLength, groupBy));
}


/**
 * Generate a single backup/recovery code (paper code).
 *
 * @param {number} byteLength - Length of the code in bytes
 * @param {1 | 4 | 8} groupBy - Group characters with dashes (1 = no grouping)
 * @returns {string} A backup code
 *
 * @note Base32 encoding produces 8 characters for each 5 bytes
 *
 * @example
 * const code = GenerateSingleBackupCode(10, 4);
 * console.log(code); // "JBSW-Y3DP-EHPK-3PXP"
 */
export function GenerateSingleBackupCode(byteLength: number, groupBy: 1 | 4 | 8 = 1): string {
	const secret = GenerateRandomSecret(byteLength);

	if (groupBy > 1) {
		return secret.match(new RegExp(`.{1,${groupBy}}`, "g"))!.join("-");
	}

	return secret;
}


/**
 * Estimate time remaining in the current TOTP period window.
 *
 * @param {Seconds} period - Period duration in seconds (default: 30)
 * @returns {Seconds} Number of seconds until the next period begins
 *
 * @example
 * const timeLeft = EstimateTimeLeft(30);
 * console.log(`Code expires in ${timeLeft} seconds`);
 */
export function EstimateTimeLeft(period: Seconds = DefaultPeriod): Seconds {
	return period - (Math.floor(GetSystemTime()) % period);
}


/**
 * Estimate recommended skew allowance based on proximity to period boundaries.
 * Useful for determining when to allow time drift tolerance during verification.
 *
 * @param {Seconds} period - Period duration in seconds (default: 30)
 * @param {Seconds} threshold - Seconds near boundary to trigger skew allowance (default: 10)
 * @returns {{ left: number, right: number }} Recommended skew for past (left) and future (right)
 *
 * @example
 * const skew = EstimateSkewAllowance(30, 10);
 * const isValid = await VerifyTotpCode(code, secret, { allowedSkew: skew });
 */
export function EstimateSkewAllowance(period: Seconds = DefaultPeriod, threshold: Seconds = 10): { left: number, right: number } {
	const timeLeft = EstimateTimeLeft(period);
	const timeElapsed = period - timeLeft;

	return {
		left: timeElapsed < threshold ? 1 : 0,
		right: timeLeft < threshold ? 1 : 0,
	}
}


/* internal
 * -------------------------------------------------------------------------- */

/**
 * Constant-time string comparison to prevent timing attacks.
 * Always compares all characters regardless of early mismatches.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return result === 0;
}


function GetSystemTime() {
	return Date.now() / 1000;
}


function GetCounterState(counter: number): Uint8Array {
	const state = new Uint8Array(8);

	for (let i = state.length - 1; i >= 0; i--) {
		state[i] = counter & 0xff;
		counter >>= 8;
	}

	return state;
}


async function HashCounterState(counterState: Uint8Array, secretKey: Uint8Array, algorithm: Algorithm): Promise<Uint8Array> {
	const hmacKey = await crypto.subtle.importKey(
		"raw",
		secretKey,
		{ name: "HMAC", hash: { name: algorithm } },
		false,
		["sign"],
	);

	const hmacHash = await crypto.subtle.sign(
		"HMAC",
		hmacKey,
		counterState
	);

	return new Uint8Array(hmacHash);
}


function InterleaveArrays<T extends {} | null>(...arrays: T[][]) {
	return <T[]>(
		[...Array(Math.max(...arrays.map(a => a.length))).keys()]
			.map(i => arrays.map(a => a[i] ?? undefined))
			.flat()
			.filter(x => typeof x !== "undefined")
	);
}
