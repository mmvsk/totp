type DigitsString = `${number}`;

const LuhnLookup = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];


export function CalculateLuhnChecksum(payload: DigitsString) {
	const parity = (payload.length + 1) % 2;

	let sum = 0;

	for (let i = payload.length - 1; i >= 0; i--) {
		const digit = Math.round(Number(payload[i]));
		sum += i % 2 === parity ? LuhnLookup[digit] : digit;
	}

	const lastDigit = sum % 10;
	return lastDigit === 0 ? 0 : 10 - lastDigit;
}


export function VerifyLuhnChecksum(digits: DigitsString) {
	if (digits.length < 2) {
		return false;
	}

	const payload = digits.slice(0, -1) as DigitsString;
	const checksum = Math.round(Number(digits.at(-1)!));

	return CalculateLuhnChecksum(payload) === checksum;
}
