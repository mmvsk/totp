import { EncodeToBase32, DecodeBase32 } from "./base32";


/* types and defaults
 * -------------------------------------------------------------------------- */

type LongInt = number;
type Base32String = string;
type DigitsString = `${number}`;
type Seconds = number;

export type DigitsLength = 6 | 7 | 8 | 9 | 10; // but only 6 and 8 may work
export type Algorithm = (
	| "SHA-1"
	| "SHA-256"
	| "SHA-512"
);

export const DefaultAlgorithm = "SHA-1" satisfies Algorithm;
export const DefaultDigits = 6 satisfies DigitsLength;
export const DefaultPeriod = 30;


/* TOTP
 * -------------------------------------------------------------------------- */

type TotpGenerationOptions = HotpGenerationOptions & Readonly<{
	period?: Seconds;
}>;

type TotpVerificationOptions = (
	& HotpVerificationOptions
	& TotpGenerationOptions
);


export async function GenerateTotpCode(
	secret: Base32String,
	options?: TotpGenerationOptions
):
	Promise<DigitsString>
{
	const period = options?.period ?? DefaultPeriod;
	const counter = Math.floor(GetSystemTime() / period);
	return await GenerateHotpCode(counter, secret, options);
}


export async function VerifyTotpCode(
	code: DigitsString | string,
	secret: Base32String,
	options?: TotpVerificationOptions
) {
	const period = options?.period ?? DefaultPeriod;
	const counter = Math.floor(GetSystemTime() / period);
	return await VerifyHotpCode(code, counter, secret, options);
}


/* HOTP
 * -------------------------------------------------------------------------- */

type HotpGenerationOptions = Readonly<{
	digits?: DigitsLength;
	algorithm?: Algorithm;
}>;

type HotpVerificationOptions = HotpGenerationOptions & Readonly<{
	strictDigits?: boolean; // default false
	allowedSkew?: { left: number, right: number };
}>;


export async function GenerateHotpCode(
	counter: LongInt,
	secret: Base32String,
	options?: HotpGenerationOptions
):
	Promise<DigitsString>
{
	const digits = options?.digits ?? DefaultDigits;
	const algorithm = options?.algorithm ?? DefaultAlgorithm;
	const counterState = GetCounterState(counter);

	const keyBytes = DecodeBase32(secret);

	const hashBytes = await HashCounterState(counterState, keyBytes, algorithm);

	const offset = hashBytes[hashBytes.length - 1] & 0xf;
	const fullCode = (0
		| ((hashBytes[offset + 0] & 0x7f) << 24)
		| ((hashBytes[offset + 1] & 0xff) << 16)
		| ((hashBytes[offset + 2] & 0xff) << 8)
		| (hashBytes[offset + 3] & 0xff)
	);

	const code = fullCode.toString(10).slice(-digits).padStart(digits, "0");

	return code as DigitsString;
};


export async function VerifyHotpCode(
	code: DigitsString | string,
	counter: LongInt,
	secret: Base32String,
	options?: HotpVerificationOptions
) {
	if (code.length < 6 || code.length > 10) {
		return false;
	}

	const digits = code.length as DigitsLength;

	if (options?.strictDigits) {
		if (!options.digits) {
			throw new Error("strict digits: you must provide a specific number of expected digits");
		}

		if (code.length !== options.digits) {
			return false;
		}
	}

	const allowedSkew = options?.allowedSkew;

	const counterValues = (
		!allowedSkew ? [counter] : [counter, ...InterleaveArrays(
			[...Array(allowedSkew.left).keys()].map(i => counter - (i + 1)),
			[...Array(allowedSkew.right).keys()].map(i => counter - (i + 1)),
		)]
	);

	for (let i = 0; i < counterValues.length; i++) {
		if (await GenerateHotpCode(counterValues[i], secret, { ...options, digits }) === code) {
			return true;
		}
	}

	return false;
};


/* utilities
 * -------------------------------------------------------------------------- */

/**
 * generate a random base32-encoded secret key.
 *
 * - note 1: 5 bytes gives an 8-chars-long secret (otherwise padded).
 * - node 2: in the QR-code for authenticator apps, GitHub gives a secret of 10 bytes
 */
export function GenerateRandomSecret(byteLength: number): Base32String {
	const secretBytes = crypto.getRandomValues(new Uint8Array(byteLength));
	return EncodeToBase32(secretBytes, false);
};


/**
 * generate a TOTP url, so it can be presented as a QR code to the authenticator app.
 *
 * github example: issuer=GitHub, account=Github:[username], secret is 10 bytes long
 */
export function GenerateTotpUrl(
	issuer: string,
	user: string,
	secret: Base32String,
	options?: Readonly<{
		digits?: DigitsLength;
		period?: Seconds;
		algorithm?: Algorithm;
	}>
) {
	const encodedIssuer = encodeURIComponent(issuer);
	const encodedAccount = encodeURIComponent(`${issuer}:${user}`);

	const algorithmOption = options?.algorithm ? `&algorithm=${options.algorithm.replace(/-/g, "")}` : "";
	const digitsOption = options?.digits ? `&digits=${options.digits}` : "";
	const periodOption = options?.period ? `&period=${options.period}` : "";

	return (
		`otpauth://totp/${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}`
		+ algorithmOption
		+ digitsOption
		+ periodOption
	);
}


/**
 * generate many paper backup codes (to be stored in a database, and written by the user).
 *
 * - note 1: 5 bytes gives an 8-chars-long secret (otherwise padded).
 * - node 2: “group by” means grouping with dashes, group by one means no breaking
 */
export function GenerateBackupCodes(count: number, byteLength: number, groupBy: 1 | 4 | 8 = 1) {
	return [...Array(count)].map(() => GenerateSingleBackupCode(byteLength, groupBy));
}


/**
 * generate a single paper backup code (to be stored in a database, and written by the user).
 *
 * - note 1: 5 bytes gives an 8-chars-long secret (otherwise padded).
 * - node 2: “group by” means grouping with dashes, group by one means no breaking
 */
export function GenerateSingleBackupCode(byteLength: number, groupBy: 1 | 4 | 8 = 1) {
	const secret = GenerateRandomSecret(byteLength);

	if (groupBy > 1) {
		return secret.match(new RegExp(`.{1,${groupBy}}`, "g"))!.join("-");
	}

	return secret;
}


/**
 * estimate time left for a specific period.
 */
export function EstimateTimeLeft(period: Seconds = DefaultPeriod) {
	return period - (Math.floor(GetSystemTime()) % period);
}


/**
 * estimates allowed skew for a specific period and threshold.
 *
 * @param {Seconds} period - period duration to check against
 * @param {Seconds} threshold - time window boundary proximity threshold
 */
export function EstimateSkewAllowance(period: Seconds = DefaultPeriod, threshold: Seconds = 10) {
	const timeLeft = EstimateTimeLeft(period);
	const timeElapsed = period - timeLeft;

	return {
		left: timeElapsed < threshold ? 1 : 0,
		right: timeLeft < threshold ? 1 : 0,
	}
}


/* internal
 * -------------------------------------------------------------------------- */

function GetSystemTime() {
	return Date.now() / 1000;
}


function GetCounterState(counter: number): Uint8Array {
	const state = new Uint8Array(8);

	for (let i = state.length - 1; i >= 0; i--) {
		state[i] = counter & 0xff;
		counter >>= 8;
	}

	return state;
}


async function HashCounterState(counterState: Uint8Array, secretKey: Uint8Array, algorithm: Algorithm): Promise<Uint8Array> {
	const hmacKey = await crypto.subtle.importKey(
		"raw",
		secretKey,
		{ name: "HMAC", hash: { name: algorithm } },
		false,
		["sign"],
	);

	const hmacHash = await crypto.subtle.sign(
		"HMAC",
		hmacKey,
		counterState
	);

	return new Uint8Array(hmacHash);
}


function InterleaveArrays<T extends {} | null>(...arrays: T[][]) {
	return <T[]>(
		[...Array(Math.max(...arrays.map(a => a.length))).keys()]
			.map(i => arrays.map(a => a[i] ?? undefined))
			.flat()
			.filter(x => typeof x !== "undefined")
	);
}
