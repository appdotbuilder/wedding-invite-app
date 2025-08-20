import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export async function getUsers(): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .execute();

    // Return users with proper type mapping
    return results.map(user => ({
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
      last_login: user.last_login ? new Date(user.last_login) : null,
      approved_at: user.approved_at ? new Date(user.approved_at) : null
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

export async function getUsersPendingApproval(): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.status, 'pending'))
      .execute();

    // Return users with proper type mapping
    return results.map(user => ({
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
      last_login: user.last_login ? new Date(user.last_login) : null,
      approved_at: user.approved_at ? new Date(user.approved_at) : null
    }));
  } catch (error) {
    console.error('Failed to fetch users pending approval:', error);
    throw error;
  }
}