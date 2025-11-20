/**
 * Backup Codes Example
 *
 * Demonstrates generating and verifying backup/recovery codes
 * for account recovery when users lose their 2FA device.
 */

import { GenerateBackupCodes, GenerateSingleBackupCode } from "../lib";
import { CalculateLuhnChecksum } from "../lib/luhn";

console.log("=== Backup Code Generation ===\n");

// Generate 8 backup codes with grouping for readability
const codes = GenerateBackupCodes(8, 10, 4);

console.log("Generated 8 backup codes:\n");
codes.forEach((code, index) => {
	console.log(`${index + 1}. ${code}`);
});

console.log("\n⚠️  Important: Store these codes hashed, not in plain text!");
console.log("Users should save these codes securely (download, print, etc.)\n");

// Example: Hashing backup codes for storage
console.log("=== Secure Storage ===\n");

async function hashBackupCode(code: string): Promise<string> {
	// Remove dashes for hashing
	const normalized = code.replace(/-/g, "");
	const encoder = new TextEncoder();
	const data = encoder.encode(normalized);
	const hash = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hash))
		.map(b => b.toString(16).padStart(2, "0"))
		.join("");
}

// Hash the first code
const firstCode = codes[0];
const hashedCode = await hashBackupCode(firstCode);
console.log(`Original: ${firstCode}`);
console.log(`Hashed:   ${hashedCode}`);
console.log("\nStore the hash in your database\n");

// Verification function
async function verifyBackupCode(
	userCode: string,
	storedHashes: string[]
): Promise<boolean> {
	const userHash = await hashBackupCode(userCode);

	// Check if hash matches any stored hash
	const index = storedHashes.indexOf(userHash);

	if (index !== -1) {
		console.log(`✓ Backup code valid (code #${index + 1})`);
		console.log("⚠️  Remove this hash from database (one-time use!)");
		return true;
	}

	console.log("✗ Invalid backup code");
	return false;
}

// Example verification
console.log("=== Verification Example ===\n");

const storedHashes = await Promise.all(codes.map(hashBackupCode));

// User enters a backup code (with or without dashes)
const userInput = codes[2]; // Simulating user entering the 3rd code
await verifyBackupCode(userInput, storedHashes);

console.log("\n=== Different Grouping Styles ===\n");

// No grouping
const ungrouped = GenerateSingleBackupCode(10, 1);
console.log(`No grouping: ${ungrouped}`);

// 4-char groups (recommended)
const grouped4 = GenerateSingleBackupCode(10, 4);
console.log(`4-char groups: ${grouped4}`);

// 8-char groups
const grouped8 = GenerateSingleBackupCode(10, 8);
console.log(`8-char groups: ${grouped8}`);

console.log("\n=== Adding Luhn Checksum ===\n");
console.log("Optional: Add checksum for typo detection\n");

function generateBackupCodeWithChecksum(byteLength: number): string {
	// Generate base code (ungrouped)
	const baseCode = GenerateSingleBackupCode(byteLength, 1);

	// Calculate checksum on the numeric representation
	// Note: This is a simplified example; in production you might
	// convert base32 to numeric or use a different approach
	const checksum = CalculateLuhnChecksum(baseCode.slice(0, 10) as `${number}`);

	return `${baseCode}-${checksum}`;
}

const codeWithChecksum = generateBackupCodeWithChecksum(10);
console.log(`Code with checksum: ${codeWithChecksum}`);
console.log("Checksum helps detect typos when users manually enter codes");
