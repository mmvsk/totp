/*
 * Copyright (c) 2011, Chris Umbel
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * ---
 * 
 * Original repository: https://github.com/chrisumbel/thirty-two
 *
 * Modified by Max Ruman in 2024.
 */


/** RFC 4648 */
const CharTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const PaddingChar = "=".charCodeAt(0); // 0x3d

const ByteTable = [
	0xff, 0xff, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
	0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
	0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
	0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
	0x17, 0x18, 0x19, 0xff, 0xff, 0xff, 0xff, 0xff,
	0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
	0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
	0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
	0x17, 0x18, 0x19, 0xff, 0xff, 0xff, 0xff, 0xff,
];


export function EncodeToBase32(inputBytes: Uint8Array, withPadding: boolean = true): string {
	const outputLength = 8 * (Math.floor(inputBytes.length / 5) + (inputBytes.length % 5 === 0 ? 0 : 1));
	const outputChars = new Uint8Array(outputLength);

	let i = 0;
	let j = 0;
	let shiftIndex = 0;

	while (i < inputBytes.length) {
		const currentByte = inputBytes[i];
		let charIndex = 0;

		if (shiftIndex > 3) {
			charIndex = currentByte & (0xff >> shiftIndex);
			shiftIndex = (shiftIndex + 5) % 8;
			charIndex = (0
				| (charIndex << shiftIndex)
				| ((i + 1 < inputBytes.length) ? inputBytes[i + 1] : 0) >> (8 - shiftIndex)
			);

			i++;

		} else {
			charIndex = (currentByte >> (8 - (shiftIndex + 5))) & 0x1f;

			shiftIndex = (shiftIndex + 5) % 8;

			if (shiftIndex === 0) {
				i++;
			}
		}

		outputChars[j] = CharTable.charCodeAt(charIndex);
		j++;
	}

	if (!withPadding) {
		return new TextDecoder().decode(outputChars).slice(0, j);
	}

	for (let i = j; i < outputChars.length; i++) {
		outputChars[i] = PaddingChar;
	}

	return new TextDecoder().decode(outputChars);
};


export function DecodeBase32(base32String: string): Uint8Array {
	const encoded = new TextEncoder().encode(base32String);
	//Buffer.from(base32String);

	const decoded = new Uint8Array(Math.ceil(encoded.length * 5 / 8));

	let plainChar = 0;
	let plainIndex = 0;
	let shiftIndex = 0;

	for (let i = 0; i < encoded.length; i++) {
		if (encoded[i] === PaddingChar) {
			break;
		}

		const encodedByte = encoded[i] - 0x30;

		if (encodedByte >= ByteTable.length) {
			throw new Error("Invalid input: not a valid base32-encoded string");
		}

		const plainDigit = ByteTable[encodedByte];

		if (shiftIndex <= 3) {
			shiftIndex = (shiftIndex + 5) % 8;

			if (shiftIndex === 0) {
				plainChar |= plainDigit;
				decoded[plainIndex] = plainChar;
				plainIndex++;
				plainChar = 0;

			} else {
				plainChar |= 0xff & (plainDigit << (8 - shiftIndex));
			}

		} else {
			shiftIndex = (shiftIndex + 5) % 8;
			plainChar |= 0xff & (plainDigit >>> shiftIndex);
			decoded[plainIndex] = plainChar;
			plainIndex++;
			plainChar = 0xff & (plainDigit << (8 - shiftIndex));
		}

	}

	return decoded.slice(0, plainIndex);
};
