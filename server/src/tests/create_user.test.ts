import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser, verifyPassword } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

const testUserMitra: CreateUserInput = {
  name: 'John Doe',
  username: 'johndoe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  password: 'password123',
  role: 'user_mitra'
};

const testUserCustomer: CreateUserInput = {
  name: 'Jane Smith',
  username: 'janesmith',
  email: 'jane.smith@example.com',
  phone: '+0987654321',
  password: 'securepass456',
  role: 'user_customer'
};

const testSuperAdmin: CreateUserInput = {
  name: 'Admin User',
  username: 'admin',
  email: 'admin@example.com',
  phone: null,
  password: 'adminpass789',
  role: 'super_admin'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user_mitra with pending status', async () => {
    const result = await createUser(testUserMitra);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.username).toEqual('johndoe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.phone).toEqual('+1234567890');
    expect(result.role).toEqual('user_mitra');
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.last_login).toBeNull();
    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
  });

  it('should create a user_customer with active status', async () => {
    const result = await createUser(testUserCustomer);

    expect(result.name).toEqual('Jane Smith');
    expect(result.username).toEqual('janesmith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.phone).toEqual('+0987654321');
    expect(result.role).toEqual('user_customer');
    expect(result.status).toEqual('active');
  });

  it('should create a super_admin with active status', async () => {
    const result = await createUser(testSuperAdmin);

    expect(result.name).toEqual('Admin User');
    expect(result.username).toEqual('admin');
    expect(result.email).toEqual('admin@example.com');
    expect(result.phone).toBeNull();
    expect(result.role).toEqual('super_admin');
    expect(result.status).toEqual('active');
  });

  it('should hash the password correctly', async () => {
    const result = await createUser(testUserMitra);

    // Query database to get the stored password hash
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const storedUser = users[0];

    // Verify password was hashed (should not be plaintext)
    expect(storedUser.password_hash).not.toEqual('password123');
    expect(storedUser.password_hash).toBeDefined();
    expect(storedUser.password_hash).toContain(':'); // Should contain salt separator
    
    // Verify password can be verified with our hash function
    const passwordIsValid = verifyPassword('password123', storedUser.password_hash);
    expect(passwordIsValid).toBe(true);

    // Verify wrong password fails
    const wrongPasswordIsValid = verifyPassword('wrongpassword', storedUser.password_hash);
    expect(wrongPasswordIsValid).toBe(false);
  });

  it('should encrypt sensitive data in database', async () => {
    const result = await createUser(testUserMitra);

    // Query database to check encrypted data
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const storedUser = users[0];

    // Sensitive fields should be encrypted (not match original values)
    expect(storedUser.name).not.toEqual('John Doe');
    expect(storedUser.email).not.toEqual('john.doe@example.com');
    expect(storedUser.phone).not.toEqual('+1234567890');

    // Encrypted values should contain the IV separator
    expect(storedUser.name).toContain(':');
    expect(storedUser.email).toContain(':');
    if (storedUser.phone) {
      expect(storedUser.phone).toContain(':');
    }

    // But response should return decrypted values
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.phone).toEqual('+1234567890');

    // Non-sensitive fields should match
    expect(storedUser.username).toEqual('johndoe');
    expect(storedUser.role).toEqual('user_mitra');
    expect(storedUser.status).toEqual('pending');
  });

  it('should handle null phone number', async () => {
    const result = await createUser(testSuperAdmin);

    expect(result.phone).toBeNull();

    // Query database to verify null phone
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].phone).toBeNull();
  });

  it('should enforce unique username constraint', async () => {
    // Create first user
    await createUser(testUserMitra);

    // Try to create another user with same username
    const duplicateUser: CreateUserInput = {
      ...testUserCustomer,
      username: 'johndoe' // Same username as first user
    };

    await expect(createUser(duplicateUser)).rejects.toThrow(/unique/i);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testUserMitra);

    // Try to create another user with same email
    const duplicateUser: CreateUserInput = {
      ...testUserCustomer,
      username: 'differentusername',
      email: 'john.doe@example.com' // Same email as first user
    };

    await expect(createUser(duplicateUser)).rejects.toThrow(/unique/i);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreate = new Date();
    const result = await createUser(testUserMitra);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Timestamps should be within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);
  });

  it('should create multiple users successfully', async () => {
    const user1 = await createUser(testUserMitra);
    const user2 = await createUser(testUserCustomer);
    const user3 = await createUser(testSuperAdmin);

    expect(user1.id).toBeDefined();
    expect(user2.id).toBeDefined();
    expect(user3.id).toBeDefined();

    // All users should have different IDs
    expect(user1.id).not.toEqual(user2.id);
    expect(user2.id).not.toEqual(user3.id);
    expect(user1.id).not.toEqual(user3.id);

    // Verify all users are in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(3);
  });

  it('should generate different hashes for same password', async () => {
    const user1 = await createUser(testUserMitra);
    
    // Create another user with same password but different username/email
    const anotherUser: CreateUserInput = {
      ...testUserMitra,
      username: 'johndoe2',
      email: 'john.doe2@example.com'
    };
    const user2 = await createUser(anotherUser);

    // Query both users from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user1.id))
      .execute();
    
    const users2 = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user2.id))
      .execute();

    // Same password should generate different hashes (due to different salts)
    expect(users[0].password_hash).not.toEqual(users2[0].password_hash);
    
    // But both should verify correctly
    expect(verifyPassword('password123', users[0].password_hash)).toBe(true);
    expect(verifyPassword('password123', users2[0].password_hash)).toBe(true);
  });

  it('should use deterministic encryption for email to support unique constraints', async () => {
    // Create two users with same email should fail due to unique constraint
    const user1 = await createUser(testUserMitra);
    
    const duplicateEmailUser: CreateUserInput = {
      ...testUserCustomer,
      username: 'differentusername',
      email: 'john.doe@example.com' // Same email as first user
    };

    // This should fail with unique constraint violation
    await expect(createUser(duplicateEmailUser)).rejects.toThrow(/unique/i);
    
    // Verify that names get different encrypted values (random IV)
    const user3 = await createUser({
      ...testSuperAdmin,
      username: 'admin2',
      email: 'admin2@example.com',
      name: 'John Doe' // Same name as testUserMitra
    });

    // Query both users to compare encrypted names
    const users1 = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user1.id))
      .execute();
    
    const users3 = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user3.id))
      .execute();

    // Same names should have different encrypted values (random IV)
    expect(users1[0].name).not.toEqual(users3[0].name);
  });
});