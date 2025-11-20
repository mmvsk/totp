/**
 * QR Code Generation Example
 *
 * This example shows how to generate QR codes for TOTP setup.
 * You'll need a QR code library like 'qrcode' for actual generation.
 *
 * Installation:
 *   bun add qrcode
 *   bun add @types/qrcode -d
 */

import { GenerateRandomSecret, GenerateTotpUrl } from "@/totp";

// Uncomment when you have qrcode installed:
// import QRCode from "qrcode";

console.log("=== QR Code Generation for 2FA Setup ===\n");

// Step 1: Generate secret and URL
const secret = GenerateRandomSecret(10);
const issuer = "MyAwesomeApp";
const username = "user@example.com";

const url = GenerateTotpUrl(issuer, username, secret, {
	digits: 6,
	period: 30,
	algorithm: "SHA-1",
});

console.log("Secret:", secret);
console.log("URL:", url);
console.log();

// Step 2: Generate QR Code (pseudo-code, requires qrcode library)
console.log("To generate actual QR codes, install the 'qrcode' library:");
console.log("  bun add qrcode @types/qrcode\n");

console.log("Then use one of these methods:\n");

// Method 1: Generate as SVG string
console.log("// Method 1: SVG String (good for web)");
console.log(`const svg = await QRCode.toString(url, { type: "svg" });`);
console.log(`// Display in HTML: <div innerHTML={svg}></div>\n`);

// Method 2: Generate as Data URL
console.log("// Method 2: Data URL (good for img tags)");
console.log(`const dataUrl = await QRCode.toDataURL(url);`);
console.log(`// <img src={dataUrl} alt="2FA QR Code" />\n`);

// Method 3: Generate as PNG buffer
console.log("// Method 3: PNG Buffer (good for saving to file)");
console.log(`const buffer = await QRCode.toBuffer(url);`);
console.log(`await Bun.write("qrcode.png", buffer);\n`);

// Method 4: Generate to terminal (for CLI tools)
console.log("// Method 4: Terminal output");
console.log(`await QRCode.toString(url, { type: "terminal" }, (err, str) => {`);
console.log(`  console.log(str);`);
console.log(`});\n`);

// Example: Full implementation with qrcode library
console.log("=== Full Example Implementation ===\n");
console.log(`
import QRCode from "qrcode";
import { GenerateRandomSecret, GenerateTotpUrl } from "totp";

async function setup2FAWithQR(issuer: string, username: string) {
  // Generate secret and URL
  const secret = GenerateRandomSecret(10);
  const url = GenerateTotpUrl(issuer, username, secret);

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  return {
    secret,     // Store this encrypted in your database
    qrCode: qrCodeDataUrl, // Send this to the frontend
  };
}

// Usage in an API endpoint
const result = await setup2FAWithQR("MyApp", "user@example.com");

// Return to client
return {
  qrCode: result.qrCode,
  // Don't send the secret to the client!
};
`);

console.log("\n=== QR Code Best Practices ===\n");
console.log("✓ Generate fresh QR codes for each user");
console.log("✓ Display QR code only once during setup");
console.log("✓ Also show the secret key in text form (manual entry backup)");
console.log("✓ Verify the user can generate codes before completing setup");
console.log("✓ Use HTTPS to prevent QR code interception");
console.log("✓ Consider adding your app logo to the QR code");
console.log();

// Alternative: Simple ASCII QR code for terminal
console.log("=== Simple Terminal QR Code (no dependencies) ===\n");
console.log("For CLI tools, you can also just display the URL:");
console.log();
console.log("┌─────────────────────────────────────────┐");
console.log("│  Scan this QR code or enter manually:  │");
console.log("│                                         │");
console.log("│  [QR CODE WOULD BE HERE]                │");
console.log("│                                         │");
console.log(`│  Secret: ${secret}        │`);
console.log("│                                         │");
console.log("└─────────────────────────────────────────┘");
console.log();

// Example: Web API response
console.log("=== Example API Response ===\n");

const apiResponse = {
	success: true,
	data: {
		// Don't include the actual secret in API response!
		// Store it server-side associated with user
		qrCodeUrl: url,
		issuer: issuer,
		account: username,
		// Optional: pre-generated QR code as base64
		// qrCodeImage: "data:image/png;base64,..."
	},
};

console.log(JSON.stringify(apiResponse, null, 2));
console.log();

console.log("Frontend displays the QR code and asks user to verify");
console.log("by entering a code from their authenticator app.");
