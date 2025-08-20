import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser, approveUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test data
const createTestUser = async (userData: Partial<CreateUserInput> = {}): Promise<number> => {
  const defaultUserData = {
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    phone: '+1234567890',
    password: 'password123',
    role: 'user_customer' as const
  };

  const user = { ...defaultUserData, ...userData };
  // Simple password hash for testing purposes
  const passwordHash = 'hashed_' + user.password;

  const result = await db.insert(usersTable)
    .values({
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      password_hash: passwordHash,
      role: user.role,
      status: 'pending'
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user name', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toBe(userId);
    expect(result.name).toBe('Updated Name');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(dbUser[0].name).toBe('Updated Name');
  });

  it('should update user email', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'newemail@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.email).toBe('newemail@example.com');

    // Verify in database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(dbUser[0].email).toBe('newemail@example.com');
  });

  it('should update user phone', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      phone: '+9876543210'
    };

    const result = await updateUser(updateInput);

    expect(result.phone).toBe('+9876543210');

    // Verify in database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(dbUser[0].phone).toBe('+9876543210');
  });

  it('should update user status', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      status: 'active'
    };

    const result = await updateUser(updateInput);

    expect(result.status).toBe('active');

    // Verify in database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(dbUser[0].status).toBe('active');
  });

  it('should set approved_by and approved_at when provided', async () => {
    const userId = await createTestUser();
    const approverId = await createTestUser({ 
      username: 'admin', 
      email: 'admin@example.com',
      role: 'super_admin'
    });
    
    const updateInput: UpdateUserInput = {
      id: userId,
      approved_by: approverId
    };

    const result = await updateUser(updateInput);

    expect(result.approved_by).toBe(approverId);
    expect(result.approved_at).toBeInstanceOf(Date);

    // Verify in database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(dbUser[0].approved_by).toBe(approverId);
    expect(dbUser[0].approved_at).toBeInstanceOf(Date);
  });

  it('should clear approved_by and approved_at when set to null', async () => {
    const userId = await createTestUser();
    const approverId = await createTestUser({ 
      username: 'admin', 
      email: 'admin@example.com',
      role: 'super_admin'
    });

    // First approve the user
    await updateUser({
      id: userId,
      approved_by: approverId
    });

    // Then clear the approval
    const updateInput: UpdateUserInput = {
      id: userId,
      approved_by: null
    };

    const result = await updateUser(updateInput);

    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
  });

  it('should update multiple fields at once', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      name: 'Updated Name',
      email: 'updated@example.com',
      phone: '+1111111111',
      status: 'active'
    };

    const result = await updateUser(updateInput);

    expect(result.name).toBe('Updated Name');
    expect(result.email).toBe('updated@example.com');
    expect(result.phone).toBe('+1111111111');
    expect(result.status).toBe('active');

    // Verify all changes in database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(dbUser[0].name).toBe('Updated Name');
    expect(dbUser[0].email).toBe('updated@example.com');
    expect(dbUser[0].phone).toBe('+1111111111');
    expect(dbUser[0].status).toBe('active');
  });

  it('should update phone to null', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      phone: null
    };

    const result = await updateUser(updateInput);

    expect(result.phone).toBeNull();

    // Verify in database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(dbUser[0].phone).toBeNull();
  });

  it('should always update updated_at timestamp', async () => {
    const userId = await createTestUser();
    
    // Get original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserInput = {
      id: userId,
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUser[0].updated_at.getTime());
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 999999,
      name: 'Updated Name'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 999999 not found/);
  });

  it('should preserve unchanged fields', async () => {
    const userId = await createTestUser({
      name: 'Original Name',
      email: 'original@example.com',
      phone: '+1234567890'
    });
    
    const updateInput: UpdateUserInput = {
      id: userId,
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.name).toBe('Updated Name');
    expect(result.email).toBe('original@example.com'); // Should remain unchanged
    expect(result.phone).toBe('+1234567890'); // Should remain unchanged
  });
});

describe('approveUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should approve a pending user', async () => {
    const userId = await createTestUser({ role: 'user_mitra' });
    const approverId = await createTestUser({ 
      username: 'admin', 
      email: 'admin@example.com',
      role: 'super_admin'
    });

    const result = await approveUser(userId, approverId);

    expect(result.status).toBe('active');
    expect(result.approved_by).toBe(approverId);
    expect(result.approved_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(dbUser[0].status).toBe('active');
    expect(dbUser[0].approved_by).toBe(approverId);
    expect(dbUser[0].approved_at).toBeInstanceOf(Date);
  });

  it('should update timestamps correctly', async () => {
    const userId = await createTestUser();
    const approverId = await createTestUser({ 
      username: 'admin', 
      email: 'admin@example.com',
      role: 'super_admin'
    });

    // Get original timestamps
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await approveUser(userId, approverId);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUser[0].updated_at.getTime());
    expect(result.approved_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const approverId = await createTestUser({ 
      username: 'admin', 
      email: 'admin@example.com',
      role: 'super_admin'
    });

    await expect(approveUser(999999, approverId)).rejects.toThrow(/User with id 999999 not found/);
  });

  it('should work with different user roles', async () => {
    const mitraUserId = await createTestUser({ 
      username: 'mitra1',
      email: 'mitra1@example.com',
      role: 'user_mitra'
    });
    const customerUserId = await createTestUser({ 
      username: 'customer1',
      email: 'customer1@example.com',
      role: 'user_customer'
    });
    const approverId = await createTestUser({ 
      username: 'admin', 
      email: 'admin@example.com',
      role: 'super_admin'
    });

    // Approve both users
    const mitraResult = await approveUser(mitraUserId, approverId);
    const customerResult = await approveUser(customerUserId, approverId);

    expect(mitraResult.status).toBe('active');
    expect(customerResult.status).toBe('active');
    expect(mitraResult.approved_by).toBe(approverId);
    expect(customerResult.approved_by).toBe(approverId);
  });

  it('should preserve other user fields when approving', async () => {
    const userId = await createTestUser({
      name: 'Test Mitra',
      email: 'mitra@example.com',
      phone: '+1234567890',
      role: 'user_mitra'
    });
    const approverId = await createTestUser({ 
      username: 'admin', 
      email: 'admin@example.com',
      role: 'super_admin'
    });

    const result = await approveUser(userId, approverId);

    // Check that original fields are preserved
    expect(result.name).toBe('Test Mitra');
    expect(result.email).toBe('mitra@example.com');
    expect(result.phone).toBe('+1234567890');
    expect(result.role).toBe('user_mitra');
  });
});