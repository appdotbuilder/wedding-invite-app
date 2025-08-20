import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import crypto from 'crypto';

// Simple encryption for demo purposes - in production, use proper key management
const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] || 'demo-key-32-chars-long-for-aes256';
const ALGORITHM = 'aes-256-cbc';

function getEncryptionKey(): Buffer {
  // Ensure key is exactly 32 bytes for AES-256
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  if (key.length === 32) {
    return key;
  } else if (key.length > 32) {
    return key.subarray(0, 32);
  } else {
    // Pad key to 32 bytes
    const paddedKey = Buffer.alloc(32);
    key.copy(paddedKey);
    return paddedKey;
  }
}

function encrypt(text: string, deterministic: boolean = false): string {
  if (!text) return text;
  
  const key = getEncryptionKey();
  
  let iv: Buffer;
  if (deterministic) {
    // Use deterministic IV for fields that need unique constraints (like email)
    // Create IV from hash of the text to ensure same text always gets same IV
    iv = crypto.createHash('md5').update(text + 'deterministic_salt').digest().subarray(0, 16);
  } else {
    // Use random IV for fields that don't need unique constraints (like name, phone)
    iv = crypto.randomBytes(16);
  }
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password: string, hash: string): boolean {
  const [salt, originalHash] = hash.split(':');
  const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return originalHash === testHash;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password using Node.js crypto
    const password_hash = hashPassword(input.password);

    // Encrypt sensitive data
    const encryptedName = encrypt(input.name); // Random IV for name
    const encryptedEmail = encrypt(input.email, true); // Deterministic IV for email (unique constraint)
    const encryptedPhone = input.phone ? encrypt(input.phone) : null; // Random IV for phone

    // Set status based on role
    const status = input.role === 'user_mitra' ? 'pending' : 'active';

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        name: encryptedName,
        username: input.username,
        email: encryptedEmail,
        phone: encryptedPhone,
        password_hash,
        role: input.role,
        status
      })
      .returning()
      .execute();

    const user = result[0];
    
    // Return user with decrypted sensitive data for the response
    return {
      ...user,
      name: input.name,
      email: input.email,
      phone: input.phone
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

// Export helper functions for testing
export { verifyPassword };