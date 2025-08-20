import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, loginLogsTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { authenticateUser } from '../handlers/authenticate_user';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  phone: '1234567890',
  password_hash: 'testpassword123', // In real app, this would be bcrypt hash
  role: 'user_customer' as const,
  status: 'active' as const
};

// Test login input
const validLogin: LoginInput = {
  username: 'testuser',
  password: 'testpassword123'
};

const invalidLogin: LoginInput = {
  username: 'testuser',
  password: 'wrongpassword'
};

const nonExistentUserLogin: LoginInput = {
  username: 'nonexistent',
  password: 'anypassword'
};

describe('authenticateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user
    const insertedUsers = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user = insertedUsers[0];

    // Authenticate user
    const result = await authenticateUser(validLogin);

    // Verify authentication successful
    expect(result).not.toBeNull();
    expect(result!.username).toEqual('testuser');
    expect(result!.email).toEqual('test@example.com');
    expect(result!.role).toEqual('user_customer');
    expect(result!.status).toEqual('active');
    expect(result!.id).toEqual(user.id);
    expect(result!.last_login).toBeInstanceOf(Date);
  });

  it('should update last_login timestamp on successful authentication', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Authenticate user
    const result = await authenticateUser(validLogin);

    // Verify last_login was updated
    expect(result).not.toBeNull();
    expect(result!.last_login).toBeInstanceOf(Date);

    // Verify database was updated
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'testuser'))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].last_login).toBeInstanceOf(Date);
  });

  it('should log successful login attempt', async () => {
    // Create test user
    const insertedUsers = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user = insertedUsers[0];

    // Authenticate user
    await authenticateUser(validLogin);

    // Check login log was created
    const loginLogs = await db.select()
      .from(loginLogsTable)
      .where(eq(loginLogsTable.user_id, user.id))
      .execute();

    expect(loginLogs).toHaveLength(1);
    expect(loginLogs[0].user_id).toEqual(user.id);
    expect(loginLogs[0].success).toBe(true);
    expect(loginLogs[0].ip_address).toEqual('127.0.0.1');
    expect(loginLogs[0].user_agent).toEqual('test-agent');
    expect(loginLogs[0].login_time).toBeInstanceOf(Date);
  });

  it('should return null for invalid password', async () => {
    // Create test user
    const insertedUsers = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user = insertedUsers[0];

    // Attempt authentication with wrong password
    const result = await authenticateUser(invalidLogin);

    // Verify authentication failed
    expect(result).toBeNull();

    // Check failed login was logged
    const loginLogs = await db.select()
      .from(loginLogsTable)
      .where(eq(loginLogsTable.user_id, user.id))
      .execute();

    expect(loginLogs).toHaveLength(1);
    expect(loginLogs[0].success).toBe(false);
  });

  it('should return null for non-existent user', async () => {
    // Attempt authentication with non-existent user
    const result = await authenticateUser(nonExistentUserLogin);

    // Verify authentication failed
    expect(result).toBeNull();

    // Check failed login was logged with user_id 0
    const loginLogs = await db.select()
      .from(loginLogsTable)
      .where(eq(loginLogsTable.user_id, 0))
      .execute();

    expect(loginLogs).toHaveLength(1);
    expect(loginLogs[0].success).toBe(false);
    expect(loginLogs[0].user_id).toEqual(0);
  });

  it('should not update last_login for failed authentication', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Attempt authentication with wrong password
    await authenticateUser(invalidLogin);

    // Verify last_login was not updated
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'testuser'))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].last_login).toBeNull(); // Should still be null
  });

  it('should handle suspended user status', async () => {
    // Create suspended user
    const suspendedUser = {
      ...testUser,
      status: 'suspended' as const
    };

    await db.insert(usersTable)
      .values(suspendedUser)
      .returning()
      .execute();

    // Authenticate user (should still work - business logic for suspended users would be elsewhere)
    const result = await authenticateUser(validLogin);

    // Verify authentication works (status check would be in authorization layer)
    expect(result).not.toBeNull();
    expect(result!.status).toEqual('suspended');
  });

  it('should handle pending user status', async () => {
    // Create pending user
    const pendingUser = {
      ...testUser,
      status: 'pending' as const
    };

    await db.insert(usersTable)
      .values(pendingUser)
      .returning()
      .execute();

    // Authenticate user
    const result = await authenticateUser(validLogin);

    // Verify authentication works (status check would be in authorization layer)
    expect(result).not.toBeNull();
    expect(result!.status).toEqual('pending');
  });

  it('should preserve all user fields in response', async () => {
    // Create test user with all fields
    const completeUser = {
      ...testUser,
      approved_by: 1,
      approved_at: new Date('2024-01-01')
    };

    await db.insert(usersTable)
      .values(completeUser)
      .returning()
      .execute();

    // Authenticate user
    const result = await authenticateUser(validLogin);

    // Verify all fields are preserved
    expect(result).not.toBeNull();
    expect(result!.name).toEqual(testUser.name);
    expect(result!.username).toEqual(testUser.username);
    expect(result!.email).toEqual(testUser.email);
    expect(result!.phone).toEqual(testUser.phone);
    expect(result!.password_hash).toEqual(testUser.password_hash);
    expect(result!.role).toEqual(testUser.role);
    expect(result!.status).toEqual(testUser.status);
    expect(result!.approved_by).toEqual(1);
    expect(result!.approved_at).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});