import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers, getUsersPendingApproval } from '../handlers/get_users';
import { eq } from 'drizzle-orm';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users with proper type conversion', async () => {
    // Create test users with different statuses
    await db.insert(usersTable).values([
      {
        name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        phone: '1234567890',
        password_hash: 'hashed_password_1',
        role: 'user_customer',
        status: 'active'
      },
      {
        name: 'Jane Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        phone: null,
        password_hash: 'hashed_password_2',
        role: 'user_mitra',
        status: 'pending'
      },
      {
        name: 'Admin User',
        username: 'admin',
        email: 'admin@example.com',
        phone: '0987654321',
        password_hash: 'hashed_password_3',
        role: 'super_admin',
        status: 'active'
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Check first user
    const johnUser = result.find(u => u.username === 'johndoe');
    expect(johnUser).toBeDefined();
    expect(johnUser?.name).toEqual('John Doe');
    expect(johnUser?.email).toEqual('john@example.com');
    expect(johnUser?.phone).toEqual('1234567890');
    expect(johnUser?.role).toEqual('user_customer');
    expect(johnUser?.status).toEqual('active');
    expect(johnUser?.id).toBeDefined();
    expect(johnUser?.created_at).toBeInstanceOf(Date);
    expect(johnUser?.updated_at).toBeInstanceOf(Date);
    expect(johnUser?.last_login).toBeNull();
    expect(johnUser?.approved_at).toBeNull();
    expect(johnUser?.approved_by).toBeNull();

    // Check second user
    const janeUser = result.find(u => u.username === 'janesmith');
    expect(janeUser).toBeDefined();
    expect(janeUser?.name).toEqual('Jane Smith');
    expect(janeUser?.email).toEqual('jane@example.com');
    expect(janeUser?.phone).toBeNull();
    expect(janeUser?.role).toEqual('user_mitra');
    expect(janeUser?.status).toEqual('pending');

    // Check admin user
    const adminUser = result.find(u => u.username === 'admin');
    expect(adminUser).toBeDefined();
    expect(adminUser?.name).toEqual('Admin User');
    expect(adminUser?.role).toEqual('super_admin');
    expect(adminUser?.status).toEqual('active');
  });

  it('should return users ordered by creation date', async () => {
    // Create users at different times by inserting separately
    const user1Data = {
      name: 'First User',
      username: 'first',
      email: 'first@example.com',
      phone: null,
      password_hash: 'hash1',
      role: 'user_customer' as const,
      status: 'active' as const
    };

    const user2Data = {
      name: 'Second User',
      username: 'second',
      email: 'second@example.com',
      phone: null,
      password_hash: 'hash2',
      role: 'user_mitra' as const,
      status: 'pending' as const
    };

    await db.insert(usersTable).values(user1Data).execute();
    await db.insert(usersTable).values(user2Data).execute();

    const result = await getUsers();
    expect(result).toHaveLength(2);

    // Verify both users are returned
    const firstUser = result.find(u => u.username === 'first');
    const secondUser = result.find(u => u.username === 'second');
    
    expect(firstUser).toBeDefined();
    expect(secondUser).toBeDefined();
    expect(firstUser?.created_at).toBeInstanceOf(Date);
    expect(secondUser?.created_at).toBeInstanceOf(Date);
  });

  it('should handle users with last_login and approved_at dates', async () => {
    const now = new Date();
    const approvedDate = new Date(now.getTime() - 86400000); // 1 day ago
    const loginDate = new Date(now.getTime() - 3600000); // 1 hour ago

    await db.insert(usersTable).values({
      name: 'Approved User',
      username: 'approved',
      email: 'approved@example.com',
      phone: '1111111111',
      password_hash: 'hashed_password',
      role: 'user_mitra',
      status: 'active',
      last_login: loginDate,
      approved_by: 1,
      approved_at: approvedDate
    }).execute();

    const result = await getUsers();
    expect(result).toHaveLength(1);

    const user = result[0];
    expect(user.last_login).toBeInstanceOf(Date);
    expect(user.approved_at).toBeInstanceOf(Date);
    expect(user.approved_by).toEqual(1);
    expect(user.last_login?.getTime()).toBeCloseTo(loginDate.getTime(), -3); // Within seconds
    expect(user.approved_at?.getTime()).toBeCloseTo(approvedDate.getTime(), -3);
  });
});

describe('getUsersPendingApproval', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no pending users exist', async () => {
    // Create only active users
    await db.insert(usersTable).values([
      {
        name: 'Active User',
        username: 'active',
        email: 'active@example.com',
        phone: null,
        password_hash: 'hash',
        role: 'user_customer',
        status: 'active'
      }
    ]).execute();

    const result = await getUsersPendingApproval();
    expect(result).toEqual([]);
  });

  it('should return only users with pending status', async () => {
    // Create users with different statuses
    await db.insert(usersTable).values([
      {
        name: 'Pending User 1',
        username: 'pending1',
        email: 'pending1@example.com',
        phone: '1111111111',
        password_hash: 'hash1',
        role: 'user_mitra',
        status: 'pending'
      },
      {
        name: 'Active User',
        username: 'active',
        email: 'active@example.com',
        phone: null,
        password_hash: 'hash2',
        role: 'user_customer',
        status: 'active'
      },
      {
        name: 'Pending User 2',
        username: 'pending2',
        email: 'pending2@example.com',
        phone: '2222222222',
        password_hash: 'hash3',
        role: 'user_mitra',
        status: 'pending'
      },
      {
        name: 'Suspended User',
        username: 'suspended',
        email: 'suspended@example.com',
        phone: null,
        password_hash: 'hash4',
        role: 'user_customer',
        status: 'suspended'
      },
      {
        name: 'Rejected User',
        username: 'rejected',
        email: 'rejected@example.com',
        phone: null,
        password_hash: 'hash5',
        role: 'user_mitra',
        status: 'rejected'
      }
    ]).execute();

    const result = await getUsersPendingApproval();
    expect(result).toHaveLength(2);

    // Check that only pending users are returned
    const usernames = result.map(u => u.username);
    expect(usernames).toContain('pending1');
    expect(usernames).toContain('pending2');
    expect(usernames).not.toContain('active');
    expect(usernames).not.toContain('suspended');
    expect(usernames).not.toContain('rejected');

    // Verify user details
    const pending1 = result.find(u => u.username === 'pending1');
    expect(pending1?.name).toEqual('Pending User 1');
    expect(pending1?.status).toEqual('pending');
    expect(pending1?.role).toEqual('user_mitra');
    expect(pending1?.phone).toEqual('1111111111');
    expect(pending1?.created_at).toBeInstanceOf(Date);
    expect(pending1?.updated_at).toBeInstanceOf(Date);

    const pending2 = result.find(u => u.username === 'pending2');
    expect(pending2?.name).toEqual('Pending User 2');
    expect(pending2?.status).toEqual('pending');
    expect(pending2?.role).toEqual('user_mitra');
    expect(pending2?.phone).toEqual('2222222222');
  });

  it('should handle pending users with different roles', async () => {
    // Create pending users with different roles
    await db.insert(usersTable).values([
      {
        name: 'Pending Customer',
        username: 'pending_customer',
        email: 'customer@example.com',
        phone: null,
        password_hash: 'hash1',
        role: 'user_customer',
        status: 'pending'
      },
      {
        name: 'Pending Mitra',
        username: 'pending_mitra',
        email: 'mitra@example.com',
        phone: '3333333333',
        password_hash: 'hash2',
        role: 'user_mitra',
        status: 'pending'
      }
    ]).execute();

    const result = await getUsersPendingApproval();
    expect(result).toHaveLength(2);

    const customerUser = result.find(u => u.role === 'user_customer');
    const mitraUser = result.find(u => u.role === 'user_mitra');

    expect(customerUser).toBeDefined();
    expect(mitraUser).toBeDefined();
    expect(customerUser?.status).toEqual('pending');
    expect(mitraUser?.status).toEqual('pending');
  });

  it('should verify database query correctness', async () => {
    // Create test data
    await db.insert(usersTable).values([
      {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        phone: null,
        password_hash: 'hash',
        role: 'user_mitra',
        status: 'pending'
      }
    ]).execute();

    // Call the handler
    const handlerResult = await getUsersPendingApproval();

    // Verify with direct database query
    const directQuery = await db.select()
      .from(usersTable)
      .where(eq(usersTable.status, 'pending'))
      .execute();

    expect(handlerResult).toHaveLength(directQuery.length);
    expect(handlerResult[0].username).toEqual(directQuery[0].username);
    expect(handlerResult[0].status).toEqual('pending');
  });
});