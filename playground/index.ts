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
	InvalidSecretError,
	type DigitsLength,
	type Algorithm,
} from "@/totp";

// Valid values for validation
const VALID_DIGITS = [6, 7, 8, 9, 10] as const;
const VALID_ALGORITHMS = ["SHA-1", "SHA-256", "SHA-512"] as const;

console.log("# TOTP Playground\n");
showHelp();

const store: {
	secret?: string;
	period?: number;
	digits?: DigitsLength;
	algorithm?: Algorithm;
} = {};

function showHelp() {
	console.log("Commands:");
	console.log("  new <issuer> <username> [<digits>] [<period>] [<algorithm>]");
	console.log("      Generate a new secret and TOTP URL");
	console.log();
	console.log("  code [<secret>] [<digits>] [<period>] [<algorithm>]");
	console.log("      Generate a TOTP code (uses stored secret if not provided)");
	console.log();
	console.log("  verify <code> [<secret>] [<period>] [<algorithm>]");
	console.log("      Verify a TOTP code (uses stored secret if not provided)");
	console.log();
	console.log("  backup [<bytes>] [<group-by>] [<count>]");
	console.log("      Generate backup codes (defaults: bytes=10, group-by=4, count=8)");
	console.log();
	console.log("  status");
	console.log("      Show currently stored secret and settings");
	console.log();
	console.log("  clear");
	console.log("      Clear stored secret and settings");
	console.log();
	console.log("  help");
	console.log("      Show this help message");
	console.log();
	console.log("  exit");
	console.log("      Exit the playground");
	console.log();
}

function validateDigits(value: string | undefined): DigitsLength | undefined {
	if (!value) return undefined;
	const num = parseInt(value);
	if (VALID_DIGITS.includes(num as DigitsLength)) {
		return num as DigitsLength;
	}
	console.error(`Invalid digits: ${value}. Must be one of: ${VALID_DIGITS.join(", ")}`);
	return undefined;
}

function validateAlgorithm(value: string | undefined): Algorithm | undefined {
	if (!value) return undefined;
	if (VALID_ALGORITHMS.includes(value as Algorithm)) {
		return value as Algorithm;
	}
	console.error(`Invalid algorithm: ${value}. Must be one of: ${VALID_ALGORITHMS.join(", ")}`);
	return undefined;
}

async function Prompt() {
	const line = prompt("\x1b[36mtotp>\x1b[0m");

	// Handle Ctrl+D (EOF)
	if (line === null) {
		console.log("\nBye!");
		process.exit(0);
	}

	const words = line.trim().split(/\s+/g);
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
				console.error("Error: missing issuer or username");
				console.log("Usage: new <issuer> <username> [<digits>] [<period>] [<algorithm>]");
				break;
			}

			const digits = validateDigits(param[2]);
			const period = param[3] ? parseInt(param[3]) : undefined;
			const algorithm = validateAlgorithm(param[4]);

			if ((param[2] && digits === undefined) || (param[4] && algorithm === undefined)) {
				break; // Validation error already printed
			}

			try {
				const secret = GenerateRandomSecret(10);
				const url = GenerateTotpUrl(issuer, username, secret, { digits, period, algorithm });

				store.secret = secret;
				store.digits = digits;
				store.period = period;
				store.algorithm = algorithm;

				console.log(`\nSecret: \x1b[32m${secret}\x1b[0m`);
				console.log(`URL: ${url}`);

				// Spawn QR code generator if configured
				if (process.env.QR_CODE) {
					try {
						Bun.spawn([process.env.QR_CODE, url]);
						console.log(`\nQR code opened with ${process.env.QR_CODE}`);
					} catch (error) {
						console.warn(`\nWarning: Failed to open QR code: ${error}`);
					}
				}

				console.log("\nSecret stored. Use 'code' to generate codes or 'verify' to verify codes.\n");
			} catch (error) {
				if (error instanceof InvalidSecretError) {
					console.error(`Error: ${error.message}`);
				} else {
					console.error(`Error: ${error}`);
				}
			}
		} break;

		case "code": {
			const secret = param[0] ?? store.secret;
			const digits = validateDigits(param[1]) ?? store.digits ?? DefaultDigits;
			const period = (param[2] ? parseInt(param[2]) : undefined) ?? store.period ?? DefaultPeriod;
			const algorithm = validateAlgorithm(param[3]) ?? store.algorithm ?? DefaultAlgorithm;

			if (!secret) {
				console.error("Error: no secret provided or stored");
				console.log("Usage: code [<secret>] [<digits>] [<period>] [<algorithm>]");
				console.log("       or run 'new' first to generate and store a secret");
				break;
			}

			if ((param[1] && !validateDigits(param[1])) || (param[3] && !validateAlgorithm(param[3]))) {
				break; // Validation error already printed
			}

			try {
				const code = await GenerateTotpCode(secret, { digits, period, algorithm });
				const timeLeft = EstimateTimeLeft(period);

				console.log(`\nCode: \x1b[32m\x1b[1m${code}\x1b[0m`);
				console.log(`Expires in: ${timeLeft}s\n`);
			} catch (error) {
				if (error instanceof InvalidSecretError) {
					console.error(`Error: ${error.message}`);
				} else {
					console.error(`Error: ${error}`);
				}
			}
		} break;

		case "verify": {
			const code = param[0];
			const secret = param[1] ?? store.secret;
			const period = (param[2] ? parseInt(param[2]) : undefined) ?? store.period ?? DefaultPeriod;
			const algorithm = validateAlgorithm(param[3]) ?? store.algorithm ?? DefaultAlgorithm;

			if (!code || !secret) {
				console.error("Error: missing code or secret");
				console.log("Usage: verify <code> [<secret>] [<period>] [<algorithm>]");
				break;
			}

			if (param[3] && !validateAlgorithm(param[3])) {
				break; // Validation error already printed
			}

			try {
				const valid = await VerifyTotpCode(code, secret, {
					allowedSkew: EstimateSkewAllowance(period, 10),
					algorithm,
					period,
				});

				if (valid) {
					console.log("\x1b[32m✓ Valid code\x1b[0m\n");
				} else {
					console.log("\x1b[31m✗ Invalid code\x1b[0m\n");
				}
			} catch (error) {
				if (error instanceof InvalidSecretError) {
					console.error(`Error: ${error.message}`);
				} else {
					console.error(`Error: ${error}`);
				}
			}
		} break;

		case "backup": {
			const byteLength = param[0] ? parseInt(param[0]) : 10;
			const groupBy = param[1] ? parseInt(param[1]) as 1 | 4 | 8 : 4;
			const count = param[2] ? parseInt(param[2]) : 8;

			if (![1, 4, 8].includes(groupBy)) {
				console.error(`Error: group-by must be 1, 4, or 8 (got ${groupBy})`);
				break;
			}

			try {
				console.log(`\nBackup Codes (${count} codes, ${byteLength} bytes, grouped by ${groupBy}):\n`);
				let index = 1;
				for (const code of GenerateBackupCodes(count, byteLength, groupBy)) {
					console.log(`${index.toString().padStart(2)}. ${code}`);
					index++;
				}
				console.log("\n⚠️  Store these codes securely (hashed)!\n");
			} catch (error) {
				console.error(`Error: ${error}`);
			}
		} break;

		case "status": {
			console.log("\n## Stored Configuration:");
			if (store.secret) {
				console.log(`Secret:    ${store.secret}`);
				console.log(`Digits:    ${store.digits ?? DefaultDigits}`);
				console.log(`Period:    ${store.period ?? DefaultPeriod}s`);
				console.log(`Algorithm: ${store.algorithm ?? DefaultAlgorithm}`);
			} else {
				console.log("No secret stored. Use 'new' to generate one.");
			}
			console.log();
		} break;

		case "clear": {
			store.secret = undefined;
			store.digits = undefined;
			store.period = undefined;
			store.algorithm = undefined;
			console.log("Stored configuration cleared.\n");
		} break;

		case "help": {
			showHelp();
		} break;

		case "exit": {
			console.log("Bye!");
			process.exit(0);
		}

		case "": {
			// Empty input, do nothing
		} break;

		default: {
			console.log(`Unknown command: ${command}`);
			console.log("Type 'help' for available commands.\n");
		}
	}
}
