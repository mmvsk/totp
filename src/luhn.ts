type DigitsString = `${number}`;

const LuhnLookup = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];


/**
 * Calculate the Luhn checksum digit for a given payload.
 * The Luhn algorithm (mod 10) is commonly used for credit cards and other identification numbers.
 *
 * @example
 * const checksum = CalculateLuhnChecksum("123456");
 * console.log(checksum); // 3
 * const fullCode = "123456" + checksum; // "1234563"
 */
export function CalculateLuhnChecksum(payload: DigitsString): number {
	const parity = (payload.length + 1) % 2;

	let sum = 0;

	for (let i = payload.length - 1; i >= 0; i--) {
		const digit = Number(payload[i]);
		sum += i % 2 === parity ? LuhnLookup[digit]! : digit;
	}

	const lastDigit = sum % 10;
	return lastDigit === 0 ? 0 : 10 - lastDigit;
}


/**
 * Verify that a string of digits has a valid Luhn checksum.
 * The last digit should be the checksum of the preceding digits.
 *
 * @example
 * const isValid = VerifyLuhnChecksum("1234563"); // true
 * const isInvalid = VerifyLuhnChecksum("1234567"); // false
 */
export function VerifyLuhnChecksum(digits: DigitsString): boolean {
	if (digits.length < 2) {
		return false;
	}

	const payload = digits.slice(0, -1) as DigitsString;
	const checksum = Number(digits.at(-1)!);

	return CalculateLuhnChecksum(payload) === checksum;
}
