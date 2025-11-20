import { describe, expect, test } from "bun:test";
import {
	GenerateTotpUrl,
	GenerateBackupCodes,
	GenerateSingleBackupCode,
	EstimateTimeLeft,
	EstimateSkewAllowance,
} from "@/totp";

describe("TOTP URL Generation", () => {
	test("generates valid otpauth URL", () => {
		const url = GenerateTotpUrl("GitHub", "user@example.com", "JBSWY3DPEHPK3PXP");
		expect(url).toStartWith("otpauth://totp/");
		expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
		expect(url).toContain("issuer=GitHub");
	});

	test("properly encodes account name", () => {
		const url = GenerateTotpUrl("GitHub", "user@example.com", "JBSWY3DPEHPK3PXP");
		expect(url).toContain("GitHub%3Auser%40example.com");
	});

	test("includes custom digits parameter", () => {
		const url = GenerateTotpUrl("Test", "user", "JBSWY3DPEHPK3PXP", {
			digits: 8
		});
		expect(url).toContain("digits=8");
	});

	test("includes custom period parameter", () => {
		const url = GenerateTotpUrl("Test", "user", "JBSWY3DPEHPK3PXP", {
			period: 60
		});
		expect(url).toContain("period=60");
	});

	test("includes algorithm parameter", () => {
		const url = GenerateTotpUrl("Test", "user", "JBSWY3DPEHPK3PXP", {
			algorithm: "SHA-256"
		});
		expect(url).toContain("algorithm=SHA256"); // Dashes removed
	});

	test("includes all parameters when specified", () => {
		const url = GenerateTotpUrl("Test", "user", "JBSWY3DPEHPK3PXP", {
			digits: 8,
			period: 60,
			algorithm: "SHA-512"
		});
		expect(url).toContain("digits=8");
		expect(url).toContain("period=60");
		expect(url).toContain("algorithm=SHA512");
	});

	test("handles special characters in issuer and user", () => {
		const url = GenerateTotpUrl("My App", "user+tag@example.com", "JBSWY3DPEHPK3PXP");
		expect(url).toContain("My%20App");
		expect(url).toContain("user%2Btag%40example.com");
	});
});

describe("Backup Code Generation", () => {
	test("generates requested number of codes", () => {
		const codes = GenerateBackupCodes(8, 10);
		expect(codes.length).toBe(8);
	});

	test("generates codes of correct length", () => {
		const codes = GenerateBackupCodes(5, 10);
		// 10 bytes = 16 base32 chars
		codes.forEach(code => {
			expect(code.length).toBe(16);
		});
	});

	test("generates unique codes", () => {
		const codes = GenerateBackupCodes(10, 10);
		const uniqueCodes = new Set(codes);
		expect(uniqueCodes.size).toBe(10);
	});

	test("generates codes without grouping (groupBy=1)", () => {
		const codes = GenerateBackupCodes(5, 10, 1);
		codes.forEach(code => {
			expect(code).not.toContain("-");
			expect(code.length).toBe(16);
		});
	});

	test("generates codes with 4-char grouping", () => {
		const codes = GenerateBackupCodes(5, 10, 4);
		codes.forEach(code => {
			expect(code).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}$/);
		});
	});

	test("generates codes with 8-char grouping", () => {
		const codes = GenerateBackupCodes(5, 10, 8);
		codes.forEach(code => {
			expect(code).toMatch(/^[A-Z2-7]{8}-[A-Z2-7]{8}$/);
		});
	});

	test("contains only valid base32 characters (excluding dashes)", () => {
		const codes = GenerateBackupCodes(10, 10, 4);
		codes.forEach(code => {
			const withoutDashes = code.replace(/-/g, "");
			expect(withoutDashes).toMatch(/^[A-Z2-7]+$/);
		});
	});
});

describe("Single Backup Code Generation", () => {
	test("generates code of correct length", () => {
		const code = GenerateSingleBackupCode(10);
		expect(code.length).toBe(16); // 10 bytes = 16 base32 chars
	});

	test("generates different codes each time", () => {
		const code1 = GenerateSingleBackupCode(10);
		const code2 = GenerateSingleBackupCode(10);
		expect(code1).not.toBe(code2);
	});

	test("generates ungrouped code by default", () => {
		const code = GenerateSingleBackupCode(10);
		expect(code).not.toContain("-");
	});

	test("generates grouped code with groupBy=4", () => {
		const code = GenerateSingleBackupCode(10, 4);
		expect(code).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}$/);
	});

	test("handles various byte lengths", () => {
		for (const byteLength of [5, 10, 15, 20]) {
			const code = GenerateSingleBackupCode(byteLength);
			const expectedLength = Math.ceil(byteLength * 8 / 5);
			expect(code.length).toBe(expectedLength);
		}
	});
});

describe("Time Left Estimation", () => {
	test("returns value between 0 and period", () => {
		const timeLeft = EstimateTimeLeft(30);
		expect(timeLeft).toBeGreaterThan(0);
		expect(timeLeft).toBeLessThanOrEqual(30);
	});

	test("uses default period of 30 seconds", () => {
		const timeLeft = EstimateTimeLeft();
		expect(timeLeft).toBeGreaterThan(0);
		expect(timeLeft).toBeLessThanOrEqual(30);
	});

	test("works with custom periods", () => {
		const timeLeft60 = EstimateTimeLeft(60);
		expect(timeLeft60).toBeGreaterThan(0);
		expect(timeLeft60).toBeLessThanOrEqual(60);

		const timeLeft15 = EstimateTimeLeft(15);
		expect(timeLeft15).toBeGreaterThan(0);
		expect(timeLeft15).toBeLessThanOrEqual(15);
	});

	test("decreases over time", async () => {
		const time1 = EstimateTimeLeft(30);
		await new Promise(resolve => setTimeout(resolve, 1100)); // Wait 1.1 seconds
		const time2 = EstimateTimeLeft(30);

		// time2 should be less than time1 (unless we crossed a period boundary)
		// Allow for period boundary crossing
		if (time2 > time1) {
			// Crossed boundary, time2 should be close to 30
			expect(time2).toBeGreaterThan(28);
		} else {
			expect(time2).toBeLessThan(time1);
		}
	});
});

describe("Skew Allowance Estimation", () => {
	test("returns object with left and right properties", () => {
		const skew = EstimateSkewAllowance(30, 10);
		expect(skew).toHaveProperty("left");
		expect(skew).toHaveProperty("right");
	});

	test("returns 0 or 1 for left and right", () => {
		const skew = EstimateSkewAllowance(30, 10);
		expect([0, 1]).toContain(skew.left);
		expect([0, 1]).toContain(skew.right);
	});

	test("uses default period of 30 and threshold of 10", () => {
		const skew = EstimateSkewAllowance();
		expect([0, 1]).toContain(skew.left);
		expect([0, 1]).toContain(skew.right);
	});

	test("left=1 when near start of period", () => {
		// This test is timing-dependent, so we just verify the structure
		const skew = EstimateSkewAllowance(30, 10);
		const timeLeft = EstimateTimeLeft(30);

		if (timeLeft > 20) {
			// Near start (elapsed < 10)
			expect(skew.left).toBe(1);
		}
	});

	test("right=1 when near end of period", () => {
		const skew = EstimateSkewAllowance(30, 10);
		const timeLeft = EstimateTimeLeft(30);

		if (timeLeft < 10) {
			// Near end
			expect(skew.right).toBe(1);
		}
	});

	test("works with custom periods and thresholds", () => {
		const skew60_15 = EstimateSkewAllowance(60, 15);
		expect([0, 1]).toContain(skew60_15.left);
		expect([0, 1]).toContain(skew60_15.right);

		const skew15_5 = EstimateSkewAllowance(15, 5);
		expect([0, 1]).toContain(skew15_5.left);
		expect([0, 1]).toContain(skew15_5.right);
	});

	test("never allows both skews when in middle of period", () => {
		// With a large period and small threshold, middle should have no skew
		const skew = EstimateSkewAllowance(1000, 10);
		// At least one should be 0 (unless we're exactly at threshold, very unlikely)
		const sum = skew.left + skew.right;
		expect(sum).toBeLessThanOrEqual(1);
	});
});
