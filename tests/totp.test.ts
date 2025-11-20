import { describe, expect, test } from "bun:test";
import {
	GenerateTotpCode,
	VerifyTotpCode,
	GenerateHotpCode,
	VerifyHotpCode,
	GenerateRandomSecret,
	InvalidSecretError,
	InvalidCodeLengthError,
} from "../lib";

describe("TOTP", () => {
	const testSecret = "JBSWY3DPEHPK3PXP"; // "Hello!" in base32
	const shortSecret = "SHORT"; // Too short

	test("generates a valid 6-digit code by default", async () => {
		const code = await GenerateTotpCode(testSecret);
		expect(code).toMatch(/^\d{6}$/);
	});

	test("generates codes with custom digit lengths", async () => {
		const code8 = await GenerateTotpCode(testSecret, { digits: 8 });
		expect(code8).toMatch(/^\d{8}$/);

		const code7 = await GenerateTotpCode(testSecret, { digits: 7 });
		expect(code7).toMatch(/^\d{7}$/);
	});

	test("generates consistent codes for same time period", async () => {
		const code1 = await GenerateTotpCode(testSecret);
		const code2 = await GenerateTotpCode(testSecret);
		expect(code1).toBe(code2);
	});

	test("verifies valid codes", async () => {
		const code = await GenerateTotpCode(testSecret);
		const isValid = await VerifyTotpCode(code, testSecret);
		expect(isValid).toBe(true);
	});

	test("rejects invalid codes", async () => {
		const isValid = await VerifyTotpCode("000000", testSecret);
		expect(isValid).toBe(false);
	});

	test("accepts case-insensitive secrets", async () => {
		const upperCode = await GenerateTotpCode(testSecret.toUpperCase());
		const lowerCode = await GenerateTotpCode(testSecret.toLowerCase());
		expect(upperCode).toBe(lowerCode);
	});

	test("throws error for short secrets", async () => {
		expect(async () => {
			await GenerateTotpCode(shortSecret);
		}).toThrow(InvalidSecretError);
	});

	test("verifies codes with time skew allowance", async () => {
		const code = await GenerateTotpCode(testSecret);
		const isValid = await VerifyTotpCode(code, testSecret, {
			allowedSkew: { left: 1, right: 1 }
		});
		expect(isValid).toBe(true);
	});

	test("supports different algorithms", async () => {
		const codeSHA1 = await GenerateTotpCode(testSecret, { algorithm: "SHA-1" });
		const codeSHA256 = await GenerateTotpCode(testSecret, { algorithm: "SHA-256" });
		const codeSHA512 = await GenerateTotpCode(testSecret, { algorithm: "SHA-512" });

		expect(codeSHA1).toMatch(/^\d{6}$/);
		expect(codeSHA256).toMatch(/^\d{6}$/);
		expect(codeSHA512).toMatch(/^\d{6}$/);
		// Different algorithms should produce different codes
		expect(codeSHA1).not.toBe(codeSHA256);
	});

	test("supports custom periods", async () => {
		const code30 = await GenerateTotpCode(testSecret, { period: 30 });
		const code60 = await GenerateTotpCode(testSecret, { period: 60 });

		expect(code30).toMatch(/^\d{6}$/);
		expect(code60).toMatch(/^\d{6}$/);
	});
});

describe("HOTP", () => {
	const testSecret = "JBSWY3DPEHPK3PXP";
	const counter = 42;

	test("generates a valid 6-digit code by default", async () => {
		const code = await GenerateHotpCode(counter, testSecret);
		expect(code).toMatch(/^\d{6}$/);
	});

	test("generates consistent codes for same counter", async () => {
		const code1 = await GenerateHotpCode(counter, testSecret);
		const code2 = await GenerateHotpCode(counter, testSecret);
		expect(code1).toBe(code2);
	});

	test("generates different codes for different counters", async () => {
		const code1 = await GenerateHotpCode(counter, testSecret);
		const code2 = await GenerateHotpCode(counter + 1, testSecret);
		expect(code1).not.toBe(code2);
	});

	test("verifies valid codes", async () => {
		const code = await GenerateHotpCode(counter, testSecret);
		const isValid = await VerifyHotpCode(code, counter, testSecret);
		expect(isValid).toBe(true);
	});

	test("rejects invalid codes", async () => {
		const isValid = await VerifyHotpCode("000000", counter, testSecret);
		expect(isValid).toBe(false);
	});

	test("verifies codes with counter skew (backward)", async () => {
		const code = await GenerateHotpCode(counter - 1, testSecret);
		const isValid = await VerifyHotpCode(code, counter, testSecret, {
			allowedSkew: { left: 2, right: 0 }
		});
		expect(isValid).toBe(true);
	});

	test("verifies codes with counter skew (forward)", async () => {
		const code = await GenerateHotpCode(counter + 1, testSecret);
		const isValid = await VerifyHotpCode(code, counter, testSecret, {
			allowedSkew: { left: 0, right: 2 }
		});
		expect(isValid).toBe(true);
	});

	test("supports different digit lengths", async () => {
		const code8 = await GenerateHotpCode(counter, testSecret, { digits: 8 });
		expect(code8).toMatch(/^\d{8}$/);
	});

	test("throws error for codes with invalid length", async () => {
		expect(async () => {
			await VerifyHotpCode("12345", counter, testSecret); // 5 digits
		}).toThrow(InvalidCodeLengthError);

		expect(async () => {
			await VerifyHotpCode("12345678901", counter, testSecret); // 11 digits
		}).toThrow(InvalidCodeLengthError);
	});

	test("strict digits mode requires exact length", async () => {
		const code = await GenerateHotpCode(counter, testSecret, { digits: 6 });

		// Should pass with matching length
		const isValid = await VerifyHotpCode(code, counter, testSecret, {
			strictDigits: true,
			digits: 6
		});
		expect(isValid).toBe(true);
	});

	test("strict digits mode throws without digits option", async () => {
		expect(async () => {
			await VerifyHotpCode("123456", counter, testSecret, {
				strictDigits: true
				// Missing digits option
			});
		}).toThrow(InvalidCodeLengthError);
	});

	test("throws error for short secrets", async () => {
		expect(async () => {
			await GenerateHotpCode(counter, "SHORT");
		}).toThrow(InvalidSecretError);
	});
});

describe("Random Secret Generation", () => {
	test("generates secrets of correct length", () => {
		const secret = GenerateRandomSecret(10);
		// 10 bytes = 16 base32 chars (10 * 8 / 5 = 16)
		expect(secret.length).toBe(16);
	});

	test("generates different secrets each time", () => {
		const secret1 = GenerateRandomSecret(10);
		const secret2 = GenerateRandomSecret(10);
		expect(secret1).not.toBe(secret2);
	});

	test("generates only valid base32 characters", () => {
		const secret = GenerateRandomSecret(20);
		expect(secret).toMatch(/^[A-Z2-7]+$/);
	});

	test("generates secrets without padding", () => {
		const secret = GenerateRandomSecret(10);
		expect(secret).not.toContain("=");
	});
});
