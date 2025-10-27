import { randomBytes } from "crypto";
import { sendMagicLinkEmail as sendEmailViaSendGrid } from "./sendgrid.js";

/**
 * Generate a cryptographically secure token for magic links
 * Returns a 32-character URL-safe token
 */
export function generateMagicLinkToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate the magic link URL for email
 */
export function generateMagicLinkUrl(token: string, baseUrl: string): string {
  return `${baseUrl}/auth/verify?token=${token}`;
}

/**
 * Send magic link email via SendGrid
 * Falls back to console.log if SendGrid is not configured
 */
export async function sendMagicLinkEmail(email: string, magicLinkUrl: string): Promise<void> {
  try {
    await sendEmailViaSendGrid(email, magicLinkUrl);
  } catch (error) {
    console.error('❌ SendGrid email failed, falling back to console log:', error);
    console.log(`
=================================================================
🔐 MAGIC LINK EMAIL (Fallback Mode - SendGrid Failed)
=================================================================
To: ${email}
Subject: Your Login Link for Lean Workforce

Click the link below to log in to your account:

${magicLinkUrl}

This link will expire in 10 minutes and can only be used once.

If you didn't request this link, you can safely ignore this email.
=================================================================
    `);
  }
}
