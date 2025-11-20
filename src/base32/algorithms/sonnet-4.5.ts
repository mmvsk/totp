/**
 * Optimized Base32 encoder/decoder (RFC 4648)
 *
 * Design goals (in order of importance):
 * 1. Correctness, reliability, security
 * 2. Performance for longer inputs (10+ bytes)
 * 3. Performance for shorter inputs (<10 bytes)
 *
 * Optimizations:
 * - O(1) character lookup using pre-computed tables
 * - Pre-allocated output buffers to avoid reallocation
 * - Efficient bit manipulation with minimal branching
 * - Direct byte array operations before string conversion
 * - Input validation with clear error messages
 */


/** RFC 4648 Base32 alphabet */
const ENCODE_TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Padding character */
const PADDING_BYTE = 0x3d; // '='

/**
 * Decode lookup table: maps ASCII codes to 5-bit values
 * - 0x30-0x37: '0'-'7' (invalid, except '2'-'7')
 * - 0x41-0x5A: 'A'-'Z'
 * - 0x61-0x7A: 'a'-'z' (lowercase, mapped to uppercase values)
 * - 0xFF: invalid character
 */
const DECODE_TABLE = new Uint8Array(123); // covers 0-122 (0x7A)
DECODE_TABLE.fill(0xFF);

// Initialize decode table for uppercase A-Z (0x41-0x5A) -> 0-25
for (let i = 0; i < 26; i++) {
	DECODE_TABLE[65 + i] = i; // 'A'-'Z'
	DECODE_TABLE[97 + i] = i; // 'a'-'z' (case-insensitive)
}

// Initialize decode table for 2-7 (0x32-0x37) -> 26-31
for (let i = 0; i < 6; i++) {
	DECODE_TABLE[50 + i] = 26 + i; // '2'-'7'
}


/**
 * Encode bytes to Base32 string.
 *
 * Encoding algorithm:
 * - Groups input bytes into 5-byte chunks (40 bits)
 * - Each 40-bit chunk produces exactly 8 base32 characters
 * - Remaining bytes are encoded with appropriate padding
 *
 * @param inputBytes - The bytes to encode
 * @param withPadding - Whether to add padding characters (default: true)
 * @returns Base32-encoded string
 */
export function EncodeToBase32(inputBytes: Uint8Array, withPadding: boolean = true): string {
	if (inputBytes.length === 0) {
		return "";
	}

	// Calculate output size: 8 characters per 5 input bytes (rounded up)
	const outputLength = Math.ceil(inputBytes.length / 5) * 8;
	const outputBytes = new Uint8Array(outputLength);

	let inputIdx = 0;
	let outputIdx = 0;
	let buffer = 0;      // Bit accumulator (up to 40 bits)
	let bitsInBuffer = 0; // Number of valid bits in buffer

	// Process input bytes
	while (inputIdx < inputBytes.length) {
		// Load byte into buffer
		buffer = (buffer << 8) | inputBytes[inputIdx]!;
		bitsInBuffer += 8;
		inputIdx++;

		// Extract 5-bit chunks and encode
		while (bitsInBuffer >= 5) {
			bitsInBuffer -= 5;
			const index = (buffer >> bitsInBuffer) & 0x1F;
			outputBytes[outputIdx++] = ENCODE_TABLE.charCodeAt(index);
		}
	}

	// Handle remaining bits (if any)
	if (bitsInBuffer > 0) {
		// Left-align remaining bits to form a 5-bit value
		const index = (buffer << (5 - bitsInBuffer)) & 0x1F;
		outputBytes[outputIdx++] = ENCODE_TABLE.charCodeAt(index);
	}

	// Add padding if requested
	if (withPadding) {
		while (outputIdx < outputLength) {
			outputBytes[outputIdx++] = PADDING_BYTE;
		}
	}

	// Convert to string (slice off unused padding if no padding requested)
	const finalLength = withPadding ? outputLength : outputIdx;
	return new TextDecoder().decode(outputBytes.subarray(0, finalLength));
}


/**
 * Decode Base32 string to bytes.
 *
 * Decoding algorithm:
 * - Converts each base32 character to 5-bit value
 * - Accumulates bits and extracts 8-bit bytes
 * - Ignores padding characters
 * - Validates all characters against RFC 4648 alphabet
 *
 * @param base32String - The Base32 string to decode (case-insensitive)
 * @returns Decoded bytes
 * @throws {TypeError} If string contains invalid characters
 */
export function DecodeBase32(base32String: string): Uint8Array {
	if (base32String.length === 0) {
		return new Uint8Array(0);
	}

	// Pre-allocate maximum possible output size
	// Each 8 base32 chars (40 bits) produces 5 bytes
	const maxOutputLength = Math.ceil(base32String.length * 5 / 8);
	const outputBytes = new Uint8Array(maxOutputLength);

	let outputIdx = 0;
	let buffer = 0;       // Bit accumulator
	let bitsInBuffer = 0; // Number of valid bits in buffer

	// Process each character
	for (let i = 0; i < base32String.length; i++) {
		const charCode = base32String.charCodeAt(i);

		// Skip padding characters
		if (charCode === PADDING_BYTE) {
			break;
		}

		// Lookup 5-bit value
		if (charCode >= DECODE_TABLE.length) {
			throw new TypeError(`Invalid character at position ${i}: '${base32String[i]}' (code: ${charCode})`);
		}

		const value = DECODE_TABLE[charCode];

		if (value === 0xFF) {
			throw new TypeError(`Invalid character at position ${i}: '${base32String[i]}' (code: ${charCode})`);
		}

		// Add 5 bits to buffer
		buffer = (buffer << 5) | value!;
		bitsInBuffer += 5;

		// Extract complete bytes (8 bits)
		if (bitsInBuffer >= 8) {
			bitsInBuffer -= 8;
			outputBytes[outputIdx++] = (buffer >> bitsInBuffer) & 0xFF;
		}
	}

	// Return only the bytes we actually wrote
	return outputBytes.subarray(0, outputIdx);
}
