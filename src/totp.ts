import { EncodeToBase32, DecodeBase32 } from "./base32";


/* types
 * -------------------------------------------------------------------------- */

type Long = number;
type Base32 = string;
type Digits = string;
type Seconds = number;

type Algorithm = (
	| "SHA-1"
	| "SHA-256"
	| "SHA-512"
);


/* TOTP
 * -------------------------------------------------------------------------- */

type TotpGenerationOptions = HotpGenerationOptions & Readonly<{
	stepTime?: Seconds;
}>;

type TotpVerificationOptions = (
	& HotpVerificationOptions
	& TotpGenerationOptions
);


export async function GenerateTotpCode(
	secret: Base32,
	options?: TotpGenerationOptions
):
	Promise<Digits>
{
	const stepTime = options?.stepTime ?? 30;
	const counter = Math.floor(Date.now() / 1000 / stepTime);
	return await GenerateHotpCode(counter, secret, options);
}


export async function VerifyTotpCode(
	code: Digits,
	secret: Base32,
	options?: TotpVerificationOptions
):
	Promise<boolean>
{
	const stepTime = options?.stepTime ?? 30;
	const counter = Math.floor(Date.now() / 1000 / stepTime);
	return await VerifyHotpCode(code, counter, secret, options);
}


/* HOTP
 * -------------------------------------------------------------------------- */

type HotpGenerationOptions = Readonly<{
	length?: 6 | 7 | 8 | 9 | 10; // number of digits
	algorithm?: Algorithm;
}>;

type HotpVerificationOptions = HotpGenerationOptions & Readonly<{
	drift?: number;
	driftLeft?: number;
	driftRight?: number;
}>;


export async function GenerateHotpCode(
	counter: Long,
	secret: Base32,
	options?: HotpGenerationOptions
):
	Promise<Digits>
{
	const length = options?.length ?? 6;
	const algorithm = options?.algorithm ?? "SHA-1";
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

	const code = fullCode.toString(10).slice(-length).padStart(length, "0");

	return code;
};


export async function VerifyHotpCode(
	code: Digits,
	counter: Long,
	secret: Base32,
	options?: HotpVerificationOptions
):
	Promise<boolean>
{
	const drift = (options?.drift ?? 0) / 2;
	const driftLeft = options?.driftLeft ?? drift;
	const driftRight = options?.driftRight ?? drift;

	const leftSteps = [...Array(driftLeft).keys()].map(i => counter - (i + 1));
	const rightSteps = [...Array(driftRight).keys()].map(i => counter + (i + 1));
	const steps = [counter, ...InterleaveArrays(leftSteps, rightSteps)];

	for (let i = 0; i < steps.length; i++) {
		if (await GenerateHotpCode(i, secret, options) === code) {
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
export function GenerateRandomSecret(byteLength: number): Base32 {
	const secretBytes = crypto.getRandomValues(new Uint8Array(byteLength));
	return EncodeToBase32(secretBytes, false);
};


/**
 * generate a TOTP url, so it can be presented as a QR code to the authenticator app.
 *
 * github example: issuer=GitHub, account=Github:[username], secret is 10 bytes long
 */
export function GenerateTotpUrl(issuer: string, account: string, secret: Base32) {
	const encodedIssuer = encodeURIComponent(issuer);
	const encodedAccount = encodeURIComponent(account);

	return `otpauth://totp/${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}`;
}


/**
 * generate many paper backup codes (to be stored in a database, and written by the user).
 *
 * - note 1: 5 bytes gives an 8-chars-long secret (otherwise padded).
 * - node 2: “group by” means grouping with dashes, group by one means no breaking
 */
export function GenerateBackupCodes(count: number, byteLength: number, groupBy: 1 | 4 | 8 = 1): string[] {
	return [...Array(count)].map(() => GenerateSingleBackupCode(byteLength, groupBy));
}


/**
 * generate a single paper backup code (to be stored in a database, and written by the user).
 *
 * - note 1: 5 bytes gives an 8-chars-long secret (otherwise padded).
 * - node 2: “group by” means grouping with dashes, group by one means no breaking
 */
export function GenerateSingleBackupCode(byteLength: number, groupBy: 1 | 4 | 8 = 1): string {
	const secret = GenerateRandomSecret(byteLength);

	if (groupBy > 1) {
		return secret.match(new RegExp(`.{1,${groupBy}}`, "g"))!.join("-");
	}

	return secret;
}


/* internal
 * -------------------------------------------------------------------------- */

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
	return (
		[...Array(Math.max(...arrays.map(a => a.length))).keys()]
			.map(i => arrays.map(a => a[i] ?? undefined))
			.flat()
			.filter(x => typeof x !== "undefined")
	);
}
