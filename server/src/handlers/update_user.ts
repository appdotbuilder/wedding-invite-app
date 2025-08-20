import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    // Build update values dynamically based on provided fields
    const updateValues: any = {
      updated_at: new Date()
    };

    // Add fields that are provided in input
    if (input.name !== undefined) {
      // Note: In real implementation, this would be encrypted
      updateValues.name = input.name;
    }

    if (input.email !== undefined) {
      // Note: In real implementation, this would be encrypted
      updateValues.email = input.email;
    }

    if (input.phone !== undefined) {
      // Note: In real implementation, this would be encrypted
      updateValues.phone = input.phone;
    }

    if (input.status !== undefined) {
      updateValues.status = input.status;
    }

    if (input.approved_by !== undefined) {
      updateValues.approved_by = input.approved_by;
      // If setting approved_by, also set approved_at
      if (input.approved_by !== null) {
        updateValues.approved_at = new Date();
      } else {
        updateValues.approved_at = null;
      }
    }

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateValues)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Return the updated user
    // Note: In real implementation, encrypted fields would be decrypted here
    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

export async function approveUser(userId: number, approverId: number): Promise<User> {
  try {
    // Update user to approved status
    const result = await db.update(usersTable)
      .set({
        status: 'active',
        approved_by: approverId,
        approved_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Note: In real implementation, this would:
    // 1. Send notification email to user about approval
    // 2. Decrypt sensitive fields before returning

    return result[0];
  } catch (error) {
    console.error('User approval failed:', error);
    throw error;
  }
}