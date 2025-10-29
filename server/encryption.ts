import crypto from "crypto";

/**
 * Encryption Service for Sensitive Data (Jira API Tokens)
 * Uses AES-256-GCM encryption
 */

/**
 * Get encryption key from environment variable
 * CRITICAL: Must be set to a stable 32-byte hex string to prevent data corruption
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!key) {
    if (isProduction) {
      // HARD REQUIREMENT in production - fail fast
      throw new Error(
        '\n❌ CRITICAL: ENCRYPTION_KEY is required in production!\n' +
        '   Without a persistent encryption key, Jira API tokens will be corrupted on restart.\n\n' +
        '   Generate a secure 32-byte encryption key:\n' +
        '   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n\n' +
        '   Add to environment:\n' +
        '   ENCRYPTION_KEY=<your-generated-key>\n\n' +
        '   Production deployment cannot continue without this key.\n'
      );
    }
    
    // Development only - allow with warning
    console.warn(
      '\n⚠️  WARNING: ENCRYPTION_KEY not set - using temporary key!\n' +
      '   Jira API tokens will be corrupted on restart.\n' +
      '   Generate a secure key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
      '   Add to Secrets: ENCRYPTION_KEY=<your-generated-key>\n'
    );
    return crypto.randomBytes(32).toString('hex');
  }
  
  // Validate key length
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters). ` +
      `Current length: ${keyBuffer.length} bytes`
    );
  }
  
  return key;
}

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encrypt(plaintext: string): string {
  try {
    // Generate random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine iv + authTag + encrypted data
    // Format: iv(32 chars) + authTag(32 chars) + encrypted
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  } catch (error: any) {
    console.error('[Encryption Error]', error.message);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data using AES-256-GCM
 */
export function decrypt(ciphertext: string): string {
  try {
    // Extract iv, authTag, and encrypted data
    const iv = Buffer.from(ciphertext.slice(0, 32), 'hex');
    const authTag = Buffer.from(ciphertext.slice(32, 64), 'hex');
    const encrypted = ciphertext.slice(64);
    
    // Create decipher
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    console.error('[Decryption Error]', error.message);
    throw new Error('Failed to decrypt data - data may be corrupted');
  }
}

/**
 * Check if data is encrypted (basic heuristic)
 */
export function isEncrypted(data: string): boolean {
  // Encrypted data should be at least 64 chars (iv + authTag)
  // and should be valid hex
  return data.length >= 64 && /^[0-9a-f]+$/i.test(data);
}

/**
 * Safely encrypt if not already encrypted
 */
export function safeEncrypt(data: string): string {
  if (!data) return '';
  if (isEncrypted(data)) return data;
  return encrypt(data);
}

/**
 * Safely decrypt if encrypted
 */
export function safeDecrypt(data: string): string {
  if (!data) return '';
  if (!isEncrypted(data)) return data; // Already plaintext
  return decrypt(data);
}

/**
 * Generate a secure random token (for token rotation)
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Hash sensitive data (one-way, for verification)
 */
export function hash(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}
