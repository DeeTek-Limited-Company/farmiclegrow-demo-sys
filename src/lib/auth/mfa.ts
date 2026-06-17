import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

/**
 * Generates a new MFA secret for a user.
 */
export function generateMfaSecret() {
  return generateSecret();
}

/**
 * Generates an OTP Auth URI for scanning into an authenticator app.
 */
export function generateOtpAuthUri(email: string, issuer: string, secret: string) {
  return generateURI({ issuer, label: email, secret });
}

/**
 * Generates a Data URL QR code for an OTP Auth URI.
 */
export async function generateQrCode(uri: string) {
  return QRCode.toDataURL(uri);
}

/**
 * Verifies a TOTP token against a secret.
 */
export function verifyMfaToken(token: string, secret: string) {
  return verify({ token, secret });
}
