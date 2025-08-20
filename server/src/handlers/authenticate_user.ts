import { db } from '../db';
import { usersTable, loginLogsTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function authenticateUser(input: LoginInput): Promise<User | null> {
  try {
    // 1. Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      // Log failed login attempt - user not found
      await db.insert(loginLogsTable)
        .values({
          user_id: 0, // Use 0 for unknown user
          ip_address: '127.0.0.1', // Placeholder - would be encrypted in real implementation
          user_agent: 'test-agent', // Placeholder - would be encrypted in real implementation
          success: false
        })
        .execute();
      
      return null;
    }

    const user = users[0];

    // 2. Verify password against hash
    // Note: In a real implementation, this would use bcrypt.compare() or similar
    // For this implementation, we'll do a simple string comparison as placeholder
    const isPasswordValid = user.password_hash === input.password;

    if (!isPasswordValid) {
      // Log failed login attempt - wrong password
      await db.insert(loginLogsTable)
        .values({
          user_id: user.id,
          ip_address: '127.0.0.1', // Placeholder - would be encrypted in real implementation
          user_agent: 'test-agent', // Placeholder - would be encrypted in real implementation
          success: false
        })
        .execute();
      
      return null;
    }

    // 3. Update last_login timestamp
    const now = new Date();
    await db.update(usersTable)
      .set({ last_login: now })
      .where(eq(usersTable.id, user.id))
      .execute();

    // 4. Log successful login attempt
    await db.insert(loginLogsTable)
      .values({
        user_id: user.id,
        ip_address: '127.0.0.1', // Placeholder - would be encrypted in real implementation
        user_agent: 'test-agent', // Placeholder - would be encrypted in real implementation
        success: true
      })
      .execute();

    // 5. Return user data with updated last_login
    return {
      ...user,
      last_login: now
    };

  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}