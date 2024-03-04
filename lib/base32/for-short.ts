/* 
 * MIT License
 * 
 * Copyright (c) 2016-2021 Linus Unnebäck
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * ---
 * 
 * Original encoder repository: https://github.com/LinusU/base32-encode
 * Original decoder repository: https://github.com/LinusU/base32-decode
 */


/** RFC 4648 */
const CharTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const PaddingChar = "=";


export function EncodeToBase32(inputBytes: Uint8Array, withPadding: boolean = true): string {
	let bits = 0;
	let value = 0;
	let output = "";

	for (let i = 0; i < inputBytes.length; i++) {
		value = (value << 8) | inputBytes[i];

		bits += 8;

		while (bits >= 5) {
			output += CharTable[(value >>> (bits - 5)) & 0x1f];
			bits -= 5;
		}
	}

	if (bits > 0) {
		output += CharTable[(value << (5 - bits)) & 0x1f];
	}

	if (withPadding) {
		while ((output.length % 8) !== 0) {
			output += PaddingChar;
		}
	}

	return output;
}


export function DecodeBase32(base32String: string): Uint8Array {
	const input = base32String.replace(/=+$/, "");
	const decoded = new Uint8Array((input.length * 5 / 8) | 0);

	let bits = 0;
	let value = 0;
	let index = 0;

	for (let i = 0; i < input.length; i++) {
		const idx = CharTable.indexOf(input[i]);

		if (idx === -1) {
			throw new TypeError(`Invalid character found: ${input[i]}`);
		}

		value = (value << 5) | idx;
		bits += 5;

		if (bits >= 8) {
			bits -= 8;
			decoded[index++] = (value >>> bits) & 0xff;
		}
	}

	return decoded;
}
