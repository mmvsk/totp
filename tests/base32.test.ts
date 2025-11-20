import { describe, expect, test } from "bun:test";
import { EncodeToBase32, DecodeBase32 } from "@/base32";

describe("Base32 Encoding", () => {
	test("encodes empty input", () => {
		const result = EncodeToBase32(new Uint8Array([]), true);
		expect(result).toBe("");
	});

	test("encodes single byte", () => {
		const result = EncodeToBase32(new Uint8Array([0x00]), false);
		expect(result).toBe("AA");
	});

	test("encodes 'Hello!' correctly", () => {
		const input = new TextEncoder().encode("Hello!");
		const result = EncodeToBase32(input, false);
		expect(result).toBe("JBSWY3DPEE");
	});

	test("encodes with padding", () => {
		const input = new Uint8Array([0x66, 0x6f, 0x6f]); // "foo"
		const result = EncodeToBase32(input, true);
		expect(result).toBe("MZXW6===");
	});

	test("encodes without padding", () => {
		const input = new Uint8Array([0x66, 0x6f, 0x6f]); // "foo"
		const result = EncodeToBase32(input, false);
		expect(result).toBe("MZXW6");
	});

	test("produces only valid base32 characters", () => {
		const input = crypto.getRandomValues(new Uint8Array(20));
		const result = EncodeToBase32(input, false);
		expect(result).toMatch(/^[A-Z2-7]+$/);
	});

	test("padding produces length divisible by 8", () => {
		for (let i = 1; i <= 10; i++) {
			const input = new Uint8Array(i);
			const result = EncodeToBase32(input, true);
			expect(result.length % 8).toBe(0);
		}
	});
});

describe("Base32 Decoding", () => {
	test("decodes empty input", () => {
		const result = DecodeBase32("");
		expect(result.length).toBe(0);
	});

	test("decodes 'JBSWY3DPEE' to 'Hello!'", () => {
		const result = DecodeBase32("JBSWY3DPEE");
		const text = new TextDecoder().decode(result);
		expect(text).toBe("Hello!");
	});

	test("handles padding correctly", () => {
		const result = DecodeBase32("MZXW6===");
		const text = new TextDecoder().decode(result);
		expect(text).toBe("foo");
	});

	test("handles input without padding", () => {
		const result = DecodeBase32("MZXW6");
		const text = new TextDecoder().decode(result);
		expect(text).toBe("foo");
	});

	test("is case-insensitive", () => {
		const upper = DecodeBase32("JBSWY3DPEE");
		const lower = DecodeBase32("jbswy3dpee");
		const mixed = DecodeBase32("JbSwY3DpEe");

		expect(upper).toEqual(lower);
		expect(upper).toEqual(mixed);
	});

	test("throws on invalid characters", () => {
		expect(() => DecodeBase32("ABC1")).toThrow(); // '1' is invalid
		expect(() => DecodeBase32("ABC8")).toThrow(); // '8' is invalid
		expect(() => DecodeBase32("ABC9")).toThrow(); // '9' is invalid
		expect(() => DecodeBase32("ABC0")).toThrow(); // '0' is invalid
	});

	test("round-trip encoding/decoding", () => {
		const original = crypto.getRandomValues(new Uint8Array(20));
		const encoded = EncodeToBase32(original, false);
		const decoded = DecodeBase32(encoded);
		expect(decoded).toEqual(original);
	});

	test("round-trip with various lengths", () => {
		for (let len = 1; len <= 20; len++) {
			const original = crypto.getRandomValues(new Uint8Array(len));
			const encoded = EncodeToBase32(original, false);
			const decoded = DecodeBase32(encoded);
			expect(decoded).toEqual(original);
		}
	});

	test("decodes RFC 4648 test vectors", () => {
		// Test vectors from RFC 4648
		const vectors = [
			{ decoded: "", encoded: "" },
			{ decoded: "f", encoded: "MY======" },
			{ decoded: "fo", encoded: "MZXQ====" },
			{ decoded: "foo", encoded: "MZXW6===" },
			{ decoded: "foob", encoded: "MZXW6YQ=" },
			{ decoded: "fooba", encoded: "MZXW6YTB" },
			{ decoded: "foobar", encoded: "MZXW6YTBOI======" },
		];

		for (const { decoded, encoded } of vectors) {
			const input = new TextEncoder().encode(decoded);
			const result = DecodeBase32(encoded);
			expect(result).toEqual(input);
		}
	});
});

describe("Base32 Edge Cases", () => {
	test("handles large inputs", () => {
		const large = new Uint8Array(1000);
		crypto.getRandomValues(large);
		const encoded = EncodeToBase32(large, false);
		const decoded = DecodeBase32(encoded);
		expect(decoded).toEqual(large);
	});

	test("handles all possible byte values", () => {
		const allBytes = new Uint8Array(256);
		for (let i = 0; i < 256; i++) {
			allBytes[i] = i;
		}
		const encoded = EncodeToBase32(allBytes, false);
		const decoded = DecodeBase32(encoded);
		expect(decoded).toEqual(allBytes);
	});
});
