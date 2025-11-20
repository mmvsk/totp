import {
	GenerateTotpUrl,
	GenerateTotpCode,
	GenerateRandomSecret,
	GenerateBackupCodes,
	VerifyTotpCode,
	DefaultAlgorithm,
	DefaultDigits,
	DefaultPeriod,
	EstimateTimeLeft,
	EstimateSkewAllowance,
	type DigitsLength,
	type Algorithm,
} from "@";

console.log("commands:");
console.log();
console.log("    new <issuer> <username> [<digits>] [<period>] [<algorithm>]");
console.log("    code [<secret-key>] [<digits>] [<period>] [<algorithm>]");
console.log("    verify <otp-code> [<secret-key>] [<period>] [<algorithm>]");
console.log("    backup [<bytes>] [<group-by>] [<count>]");
console.log("    exit");
console.log();

const store: {
	secret?: string;
	period?: number;
	digits?: DigitsLength;
	algorithm?: Algorithm;
} = {};

async function Prompt() {
	const line = prompt("\x1b[37mtotp>\x1b[0m");
	const words = (line || "").trim().split(/\s+/g);
	const [command, ...param] = words;

	return { command, param };
}

while (true) {
	const { command, param } = await Prompt();

	switch (command) {
		case "new": {
			const issuer = param[0];
			const username = param[1];

			if (!issuer || !username) {
				console.error(`invalid usage: missing issuer or username`);
				break;
			}

			const digits = param[2] ? parseInt(param[2]) as DigitsLength : undefined;
			const period = param[3] ? parseInt(param[3]) : undefined;
			const algorithm = param[4] ? param[4] as Algorithm : undefined;

			const secret = GenerateRandomSecret(10);
			const url = GenerateTotpUrl(issuer, username, secret, { digits, period, algorithm });

			store.secret = secret;
			store.digits = digits;
			store.period = period;
			store.algorithm = algorithm;

			// spawn a qr code image generator
			if (process.env.QR_CODE) {
				Bun.spawn([process.env.QR_CODE, url]);
			}

			console.log(`secret: ${secret}`);
			console.log(`url: ${url}`);
		} break;

		case "code": {
			const secret = param[0] ?? store.secret;
			const digits = (param[1] ? parseInt(param[1]) as DigitsLength : undefined) ?? store.digits ?? DefaultDigits;
			const period = (param[2] ? parseInt(param[2]) : undefined) ?? store.period ?? DefaultPeriod;
			const algorithm = (param[3] ? param[3] as Algorithm : undefined) ?? store.algorithm ?? DefaultAlgorithm;

			if (!secret) {
				console.error(`invalid usage: missing secret`);
				break;
			}

			const code = await GenerateTotpCode(secret, { digits, period, algorithm });
			const timeLeft = EstimateTimeLeft(period);

			console.log(`${code} (time left: ${timeLeft}s)`);
		} break;

		case "verify": {
			const code = param[0];
			const secret = param[1] ?? store.secret;
			const period = (param[2] ? parseInt(param[2]) : undefined) ?? store.period ?? DefaultPeriod;
			const algorithm = (param[3] ? param[3] as Algorithm : undefined) ?? store.algorithm ?? DefaultAlgorithm;

			if (!code || !secret) {
				console.error(`invalid usage: missing code or secret`);
				break;
			}

			const valid = await VerifyTotpCode(code, secret, {
				...EstimateSkewAllowance(period, 10),
				algorithm,
				period,
			});

			if (valid) {
				console.log("valid");

			} else {
				console.error("invalid");
			}
		} break;

		case "backup": {
			const byteLength = param[0] ? parseInt(param[0]) : 10;
			const groupBy = param[1] ? parseInt(param[1]) as 1 | 4 | 8 : 1;
			const count = param[2] ? parseInt(param[2]) : 4;

			for (const code of GenerateBackupCodes(count, byteLength, groupBy)) {
				console.log(code);
			}
		} break;

		case "exit": {
			console.log("bye");
			process.exit(0);
		};

		case "": {
			console.log();
		} break;

		default: {
			console.log(`unknown command: ${command}`);
		}
	}
}
