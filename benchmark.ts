import { EncodeToBase32 as EncodeA, DecodeBase32 as DecodeA } from "./lib/base32";
import { EncodeToBase32 as EncodeB, DecodeBase32 as DecodeB } from "./lib/altBase32";


//const data = crypto.getRandomValues(new Uint8Array(641));
//const a = DecodeA(EncodeA(data));
//const b = DecodeB(EncodeB(data));
//if (a[0] !== b[0]) {
	//throw new Error("damn");
//}


//type Encoder = (inputBytes: Uint8Array) => string;
//type Decoder = (base32String: string) => Uint8Array;
//type Codec = Readonly<{ encode: Encoder; decode: Decoder }>;


//function CreateInput(bytes: number, count: number = 10) {
	//return [...Array(count)].map(() => crypto.getRandomValues(new Uint8Array(bytes)));
//}

//const inputs = new Map<number, Uint8Array[]>();
//for (let i = 0; i < 12; i++) {
	//const bytes = 2 ** i;
	//inputs.set(bytes, CreateInput(bytes, 10));
//}


//function Time(runnable: () => void) {
	//const startTime = performance.now();
	//runnable();
	//const endTime = performance.now();
	//return endTime - startTime;
//}


//function WarmUp() {
	//for (let i = 0; i < 1e3; i++) {
		//for (const input of inputs.values()) {
			//for (const data of input) {
				//DecodeA(EncodeA(data));
				//DecodeB(EncodeB(data));
			//}
		//}
	//}
//}


//function Compare(name: string, runnable: (codec: Codec) => void) {
	//const aTime = Time(() => runnable({ encode: EncodeA, decode: DecodeA }));
	//const bTime = Time(() => runnable({ encode: EncodeB, decode: DecodeB }));

	//const faster = aTime < bTime ? "A" : "B";
	//const ratio = Math.max(aTime, bTime) / Math.min(aTime, bTime);

	//console.log(`${name}: A ${aTime.toFixed(0)} ms, B ${bTime.toFixed(0)} ms, ${faster} is ${ratio.toFixed(1)}x faster (+${(100 * (ratio - 1)).toFixed(0)}%)`);
//}


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
						console.error(`  byte #${i} mistmatch: A(${formatByte(a[i])}) <> B(${formatByte(b[i])})`)
					}
				}
				console.error();
			} break;
		}

		process.exit(0);
	}

	for (let bytes = 0; bytes < 10_000; bytes++) {

		if (bytes > 641) {
			console.log("ok");
			process.exit(0);
		}

		const input = crypto.getRandomValues(new Uint8Array(bytes));

		const encodedA = EncodeA(input, false);
		const encodedB = EncodeB(input, false);
		if (encodedA !== encodedB) {
			Fail(bytes, input, "encoding", "compact", encodedA, encodedB);
		}

		const encodedAPad = EncodeA(input, true);
		const encodedBPad = EncodeB(input, true);
		if (encodedAPad !== encodedBPad) {
			Fail(bytes, input, "encoding", "compact", encodedAPad, encodedBPad);
		}

		const decodedA_byA = DecodeA(encodedA);
		const decodedA_byB = DecodeB(encodedA);
		if (decodedA_byA.toString() !== decodedA_byB.toString()) {
			Fail(bytes, input, "decoding", "A", decodedA_byA, decodedA_byB);
		}

		const decodedB_byA = DecodeA(encodedB);
		const decodedB_byB = DecodeB(encodedB);
		if (decodedB_byA.toString() !== decodedB_byB.toString()) {
			Fail(bytes, input, "decoding", "B", decodedB_byA, decodedB_byB);
		}
	}

	console.log("algorithms ok");
}


VerifyAlgorithms();

//WarmUp();

//for (const [bytes, input] of inputs.entries()) {
	//Compare(`encoding ${bytes} bytes`, codec => {
		//for (let i = 0; i < 1e3; i++) {
			//for (const data of input) {
				//codec.encode(data);
			//}
		//}
	//});

	//Compare(`decoding ${bytes} bytes`, codec => {
		//for (let i = 0; i < 1e3; i++) {
			//for (const data of input) {
				//codec.decode(codec.encode(data));
			//}
		//}
	//});

	//console.log();
//}
