/**
 * Adaptive Base32 encoder/decoder that switches between algorithms
 * based on input size for optimal performance.
 *
 * Performance characteristics (from benchmarks):
 * - Small inputs (<64 bytes): linus-unnebaeck is faster for encoding
 * - Large inputs (64+ bytes): sonnet-4.5 is faster for both encode/decode
 * - Decoding: sonnet-4.5 is faster for 16+ byte inputs
 *
 * For typical TOTP secrets (10-20 bytes), this provides marginal gains.
 * Use this only if you need peak performance across all input sizes.
 */

import { EncodeToBase32 as EncodeShort, DecodeBase32 as DecodeShort } from "./linus-unnebaeck";
import { EncodeToBase32 as EncodeLong, DecodeBase32 as DecodeLong } from "./sonnet-4.5";


/**
 * Encoding threshold in bytes.
 * - Below this: use linus-unnebaeck (optimized for short inputs)
 * - At or above: use sonnet-4.5 (optimized for long inputs)
 *
 * Benchmark crossover point is ~48 bytes, using 64 for clear benefit.
 */
const ENCODE_THRESHOLD = 64;

/**
 * Decoding threshold in base32 string length.
 * - Below this: use linus-unnebaeck
 * - At or above: use sonnet-4.5
 *
 * Based on benchmark showing sonnet-4.5 wins at 16 bytes input (26 chars output).
 * Using 26 characters as threshold.
 */
const DECODE_THRESHOLD = 26;


/**
 * Adaptive Base32 encoding that selects the fastest algorithm based on input size.
 *
 * @param inputBytes - The bytes to encode
 * @param withPadding - Whether to add padding characters (default: true)
 * @returns Base32-encoded string
 */
export function EncodeToBase32(inputBytes: Uint8Array, withPadding: boolean = true): string {
	if (inputBytes.length < ENCODE_THRESHOLD) {
		return EncodeShort(inputBytes, withPadding);
	}
	return EncodeLong(inputBytes, withPadding);
}


/**
 * Adaptive Base32 decoding that selects the fastest algorithm based on input size.
 *
 * @param base32String - The Base32 string to decode (case-insensitive)
 * @returns Decoded bytes
 * @throws {TypeError} If string contains invalid characters
 */
export function DecodeBase32(base32String: string): Uint8Array {
	if (base32String.length < DECODE_THRESHOLD) {
		return DecodeShort(base32String);
	}
	return DecodeLong(base32String);
}
