/**
 * Basic 2FA Setup Example
 *
 * This example demonstrates a complete 2FA setup flow:
 * 1. Generate a secret
 * 2. Create QR code URL
 * 3. Verify user can generate codes
 */

import {
	GenerateRandomSecret,
	GenerateTotpUrl,
	GenerateTotpCode,
	VerifyTotpCode,
	EstimateTimeLeft,
} from "../src";

async function setup2FA(issuer: string, username: string) {
	console.log("=== 2FA Setup ===\n");

	// Step 1: Generate a secret key
	const secret = GenerateRandomSecret(10); // 10 bytes = 16 base32 chars
	console.log(`Secret: ${secret}`);
	console.log(`Store this securely in your database (encrypted!)\n`);

	// Step 2: Generate QR code URL
	const url = GenerateTotpUrl(issuer, username, secret, {
		digits: 6,
		period: 30,
		algorithm: "SHA-1"
	});
	console.log(`QR Code URL: ${url}\n`);
	console.log("Display this as a QR code for the user to scan\n");

	// Step 3: User scans QR code and enters a verification code
	console.log("=== Verification ===\n");

	// Generate what the code should be right now
	const expectedCode = await GenerateTotpCode(secret);
	console.log(`Current code: ${expectedCode}`);

	const timeLeft = EstimateTimeLeft();
	console.log(`Time left: ${timeLeft} seconds\n`);

	// Simulate user entering the code
	const userEnteredCode = expectedCode; // In real app, this comes from user input

	// Verify the code (with time skew tolerance)
	const isValid = await VerifyTotpCode(userEnteredCode, secret, {
		allowedSkew: { left: 1, right: 1 } // ±30 seconds tolerance
	});

	if (isValid) {
		console.log("✓ 2FA setup successful!");
		console.log("User can now use their authenticator app for login\n");
	} else {
		console.log("✗ Verification failed");
		console.log("Ask user to try again\n");
	}

	return { secret, isValid };
}

// Run the example
const result = await setup2FA("MyApp", "user@example.com");

// Additional: Show how codes change over time
console.log("=== Code Changes ===\n");
console.log("Codes update every 30 seconds:");

for (let i = 0; i < 3; i++) {
	const code = await GenerateTotpCode(result.secret);
	const timeLeft = EstimateTimeLeft();
	console.log(`Code: ${code} (expires in ${timeLeft}s)`);

	if (i < 2) {
		await new Promise(resolve => setTimeout(resolve, 2000));
	}
}
