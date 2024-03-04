export * from "./for-long";


/*
 * Note: for < 5 bytes, for-short is faster, however the overhead of checking the
 * length and calling another function is not worth it.
 *
 
import { EncodeToBase32 as EncodeA, DecodeBase32 as DecodeA } from "./for-short";
import { EncodeToBase32 as EncodeB, DecodeBase32 as DecodeB } from "./for-long";


export function EncodeToBase32(inputBytes: Uint8Array, withPadding: boolean = true): string {
	return (
		inputBytes.byteLength < 5
			? EncodeA(inputBytes, withPadding)
			: EncodeB(inputBytes, withPadding)
	);
}


export function DecodeBase32(base32String: string): Uint8Array {
	return (
		base32String.length < 8
			? DecodeA(base32String)
			: DecodeB(base32String)
	);
}
*/
