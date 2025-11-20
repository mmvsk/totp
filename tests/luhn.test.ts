import { describe, expect, test } from "bun:test";
import { CalculateLuhnChecksum, VerifyLuhnChecksum } from "../src/luhn";

describe("Luhn Checksum Calculation", () => {
	test("calculates checksum for simple numbers", () => {
		expect(CalculateLuhnChecksum("0")).toBe(0);
		expect(CalculateLuhnChecksum("1")).toBe(8);
		expect(CalculateLuhnChecksum("2")).toBe(6);
		expect(CalculateLuhnChecksum("3")).toBe(4);
		expect(CalculateLuhnChecksum("4")).toBe(2);
		expect(CalculateLuhnChecksum("5")).toBe(9);
		expect(CalculateLuhnChecksum("6")).toBe(7);
		expect(CalculateLuhnChecksum("7")).toBe(5);
		expect(CalculateLuhnChecksum("8")).toBe(3);
		expect(CalculateLuhnChecksum("9")).toBe(1);
	});

	test("calculates checksum for longer numbers", () => {
		expect(CalculateLuhnChecksum("123456")).toBe(6);
		expect(CalculateLuhnChecksum("987654")).toBe(1);
		expect(CalculateLuhnChecksum("111111")).toBe(1);
	});

	test("calculates checksum for known credit card patterns", () => {
		// Visa test card without checksum: 424242424242424
		expect(CalculateLuhnChecksum("424242424242424")).toBe(2);

		// MasterCard test pattern without checksum: 555555555555444
		expect(CalculateLuhnChecksum("555555555555444")).toBe(4);
	});

	test("handles zeros", () => {
		expect(CalculateLuhnChecksum("00000")).toBe(0);
		expect(CalculateLuhnChecksum("10000")).toBe(8);
	});

	test("checksum is always a single digit", () => {
		for (let i = 0; i < 100; i++) {
			const num = String(Math.floor(Math.random() * 1000000000));
			const checksum = CalculateLuhnChecksum(num as `${number}`);
			expect(checksum).toBeGreaterThanOrEqual(0);
			expect(checksum).toBeLessThanOrEqual(9);
		}
	});
});

describe("Luhn Checksum Verification", () => {
	test("verifies valid checksums", () => {
		expect(VerifyLuhnChecksum("00")).toBe(true);
		expect(VerifyLuhnChecksum("18")).toBe(true);
		expect(VerifyLuhnChecksum("1234566")).toBe(true); // 123456 + checksum 6
	});

	test("rejects invalid checksums", () => {
		expect(VerifyLuhnChecksum("01")).toBe(false);
		expect(VerifyLuhnChecksum("19")).toBe(false);
		expect(VerifyLuhnChecksum("1234567")).toBe(false);
	});

	test("verifies known valid credit card numbers", () => {
		// These are standard test card numbers
		expect(VerifyLuhnChecksum("4242424242424242")).toBe(true); // Visa
		expect(VerifyLuhnChecksum("5555555555554444")).toBe(true); // MasterCard
		expect(VerifyLuhnChecksum("378282246310005")).toBe(true); // Amex
	});

	test("rejects numbers shorter than 2 digits", () => {
		expect(VerifyLuhnChecksum("0")).toBe(false);
		expect(VerifyLuhnChecksum("1")).toBe(false);
	});

	test("round-trip: calculate then verify", () => {
		const testNumbers = [
			"123456",
			"987654321",
			"111111111",
			"000000",
			"424242424242424",
		];

		for (const num of testNumbers) {
			const checksum = CalculateLuhnChecksum(num as `${number}`);
			const fullNumber = num + checksum;
			expect(VerifyLuhnChecksum(fullNumber as `${number}`)).toBe(true);
		}
	});

	test("single digit change invalidates checksum", () => {
		const validNumber = "4242424242424242";
		expect(VerifyLuhnChecksum(validNumber)).toBe(true);

		// Change one digit
		const invalidNumber = "4242424242424243";
		expect(VerifyLuhnChecksum(invalidNumber)).toBe(false);
	});

	test("random round-trip verification", () => {
		for (let i = 0; i < 50; i++) {
			const num = String(Math.floor(Math.random() * 1000000000000));
			const checksum = CalculateLuhnChecksum(num as `${number}`);
			const fullNumber = num + checksum;
			expect(VerifyLuhnChecksum(fullNumber as `${number}`)).toBe(true);
		}
	});
});

describe("Luhn Edge Cases", () => {
	test("handles very long numbers", () => {
		const longNum = "123456789012345678901234567890";
		const checksum = CalculateLuhnChecksum(longNum);
		const fullNumber = longNum + checksum;
		expect(VerifyLuhnChecksum(fullNumber as `${number}`)).toBe(true);
	});

	test("handles all zeros except checksum", () => {
		const zeros = "0000000000";
		const checksum = CalculateLuhnChecksum(zeros);
		expect(checksum).toBe(0);
		expect(VerifyLuhnChecksum(zeros + "0" as `${number}`)).toBe(true);
	});

	test("handles alternating digits", () => {
		const alternating = "1010101010";
		const checksum = CalculateLuhnChecksum(alternating);
		const fullNumber = alternating + checksum;
		expect(VerifyLuhnChecksum(fullNumber as `${number}`)).toBe(true);
	});
});
