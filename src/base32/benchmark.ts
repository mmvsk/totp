import { EncodeToBase32 as EncodeA, DecodeBase32 as DecodeA } from "./algorithms/chris-umbel";
import { EncodeToBase32 as EncodeB, DecodeBase32 as DecodeB } from "./algorithms/linus-unnebaeck";
import { EncodeToBase32 as EncodeC, DecodeBase32 as DecodeC } from "./algorithms/sonnet-4.5";


type Encoder = (inputBytes: Uint8Array) => string;
type Decoder = (base32String: string) => Uint8Array;
type Codec = Readonly<{ encode: Encoder; decode: Decoder; name: string }>;


const inputs = CreateInputs();


function CreateInputs() {
	const inputs = new Map<number, Uint8Array[]>();

	const add = (bytes: number, count: number = 10) => {
		inputs.set(bytes, [...Array(count)].map(() => crypto.getRandomValues(new Uint8Array(bytes))));
	}

	for (let i = 0; i < 12; i++) {
		add(2 ** i);

		if (i === 3) {
			// add a 10-byte input, as it's common for TOTPs
			add(10);
		}
	}

	return inputs;
}


function Time(runnable: () => void) {
	const startTime = performance.now();
	runnable();
	const endTime = performance.now();
	return endTime - startTime;
}


function WarmUp() {
	for (let i = 0; i < 1e3; i++) {
		for (const input of inputs.values()) {
			for (const data of input) {
				DecodeA(EncodeA(data));
				DecodeB(EncodeB(data));
				DecodeC(EncodeC(data));
			}
		}
	}
}


function Compare(name: string, runnable: (codec: Codec) => void) {
	const aTime = Time(() => runnable({ encode: EncodeA, decode: DecodeA, name: "for-long" }));
	const bTime = Time(() => runnable({ encode: EncodeB, decode: DecodeB, name: "for-short" }));
	const cTime = Time(() => runnable({ encode: EncodeC, decode: DecodeC, name: "claude" }));

	const times = [
		{ name: "for-long ", time: aTime },
		{ name: "for-short", time: bTime },
		{ name: "claude   ", time: cTime }
	].sort((a, b) => a.time - b.time);

	const fastest = times[0]!;
	const middle = times[1]!;
	const slowest = times[2]!;

	const ratio1 = middle.time / fastest.time;
	const ratio2 = slowest.time / fastest.time;

	console.log(`${name}:`);
	console.log(`  ${fastest.name}: ${fastest.time.toFixed(2).padStart(8)} ms (baseline)`);
	console.log(`  ${middle.name}: ${middle.time.toFixed(2).padStart(8)} ms (${ratio1.toFixed(2)}x slower, +${((ratio1 - 1) * 100).toFixed(0)}%)`);
	console.log(`  ${slowest.name}: ${slowest.time.toFixed(2).padStart(8)} ms (${ratio2.toFixed(2)}x slower, +${((ratio2 - 1) * 100).toFixed(0)}%)`);
}


function VerifyAlgorithms() {
	const formatByte = (b: number) => b.toString(16).toUpperCase().padStart(2, "0");

	function Fail(bytes: number, input: Uint8Array, operation: "encoding", variant: "padding" | "compact", a: string, b: string): never;
	function Fail(bytes: number, input: Uint8Array, operation: "decoding", variant: "A" | "B", a: Uint8Array, b: Uint8Array): never;
	function Fail(bytes: number, input: Uint8Array, ...[operation, variant, a, b]: ["encoding", "padding" | "compact", string, string] | ["decoding", "A" | "B", Uint8Array, Uint8Array]) {
		console.error(`A <> B ${operation} (${variant}) mismatch for base32 of ${bytes} bytes`);
		console.error();

		switch (operation) {
			case "encoding": {
				console.error(`  "${a}" <> ${b}`)
			} break;

			case "decoding": {
				console.error(`  A.byteLength(${a.byteLength}) B.byteLength(${b.byteLength})`);
				console.error();
				console.error(`  EncodeA(O): ${EncodeA(input)}`);
				console.error(`  EncodeB(O): ${EncodeA(input)}`);
				console.error(`  EncodeA(A): ${EncodeA(a)}`);
				console.error(`  EncodeB(A): ${EncodeB(a)}`);
				console.error(`  EncodeA(B): ${EncodeA(b)}`);
				console.error(`  EncodeB(B): ${EncodeB(b)}`);
				console.error();
				console.error(`  O bytes: ${[...input.values()].map(b => formatByte(b)).join(" ")}`);
				console.error(`  A bytes: ${[...a.values()].map(b => formatByte(b)).join(" ")}`);
				console.error(`  B bytes: ${[...b.values()].map(b => formatByte(b)).join(" ")}`);
				console.error();
				for (let i = 0; i < Math.min(a.byteLength, b.byteLength); i++) {
					if (a[i] !== b[i]) {
						console.error(`  byte #${i} mistmatch: A(${formatByte(a[i]!)}) <> B(${formatByte(b[i]!)})`)
					}
				}
				console.error();
			} break;
		}

		process.exit(0);
	}

	for (let bytes = 0; bytes < 10_000; bytes++) {
		const input = crypto.getRandomValues(new Uint8Array(bytes));

		// Test encoding without padding
		const encodedA = EncodeA(input, false);
		const encodedB = EncodeB(input, false);
		const encodedC = EncodeC(input, false);

		if (encodedA !== encodedB) {
			Fail(bytes, input, "encoding", "compact", encodedA, encodedB);
		}
		if (encodedA !== encodedC) {
			console.error(`Claude encoding mismatch at ${bytes} bytes (no padding)`);
			console.error(`  for-long: "${encodedA}"`);
			console.error(`  claude:   "${encodedC}"`);
			process.exit(1);
		}

		// Test encoding with padding
		const encodedAPad = EncodeA(input, true);
		const encodedBPad = EncodeB(input, true);
		const encodedCPad = EncodeC(input, true);

		if (encodedAPad !== encodedBPad) {
			Fail(bytes, input, "encoding", "padding", encodedAPad, encodedBPad);
		}
		if (encodedAPad !== encodedCPad) {
			console.error(`Claude encoding mismatch at ${bytes} bytes (with padding)`);
			console.error(`  for-long: "${encodedAPad}"`);
			console.error(`  claude:   "${encodedCPad}"`);
			process.exit(1);
		}

		// Test decoding consistency
		const decodedA_byA = DecodeA(encodedA);
		const decodedA_byB = DecodeB(encodedA);
		const decodedA_byC = DecodeC(encodedA);

		if (decodedA_byA.toString() !== decodedA_byB.toString()) {
			Fail(bytes, input, "decoding", "A", decodedA_byA, decodedA_byB);
		}
		if (decodedA_byA.toString() !== decodedA_byC.toString()) {
			console.error(`Claude decoding mismatch at ${bytes} bytes`);
			console.error(`  Original:  ${[...input.values()].map(b => formatByte(b)).join(" ")}`);
			console.error(`  for-long:  ${[...decodedA_byA.values()].map(b => formatByte(b)).join(" ")}`);
			console.error(`  claude:    ${[...decodedA_byC.values()].map(b => formatByte(b)).join(" ")}`);
			process.exit(1);
		}

		// Verify round-trip works for all implementations
		const originalStr = input.toString();
		if (DecodeA(encodedA).toString() !== originalStr ||
		    DecodeB(encodedB).toString() !== originalStr ||
		    DecodeC(encodedC).toString() !== originalStr) {
			console.error(`Round-trip failed at ${bytes} bytes`);
			process.exit(1);
		}
	}

	console.log("algorithms check: passed (all 3 implementations match for 0-10,000 bytes)");
	console.log();
}


VerifyAlgorithms();

WarmUp();

for (const [bytes, input] of inputs.entries()) {
	const iterations = 2 * 1e5 / bytes;

	Compare(`encoding ${bytes} bytes`, codec => {
		for (let i = 0; i < iterations; i++) {
			for (const data of input) {
				codec.encode(data);
			}
		}
	});

	Compare(`decoding ${bytes} bytes`, codec => {
		for (let i = 0; i < iterations; i++) {
			for (const data of input) {
				codec.decode(codec.encode(data));
			}
		}
	});

	console.log();
}
