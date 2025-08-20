import { db } from '../db';
import { visitorsTable, invitationsTable } from '../db/schema';
import { type Visitor } from '../schema';
import { eq, sql } from 'drizzle-orm';

// Simple encryption function for demonstration (in production, use proper encryption)
function encryptField(value: string): string {
  // In a real implementation, this would use proper encryption
  // For now, we'll use a simple base64 encoding as placeholder
  return Buffer.from(value).toString('base64');
}

export async function logVisitor(invitationId: number, ipAddress: string, userAgent: string, referrer?: string): Promise<Visitor> {
  try {
    // Start transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // First, verify invitation exists
      const invitation = await tx.select()
        .from(invitationsTable)
        .where(eq(invitationsTable.id, invitationId))
        .execute();

      if (invitation.length === 0) {
        throw new Error(`Invitation with id ${invitationId} not found`);
      }

      // Insert visitor record with encrypted fields
      const visitorResult = await tx.insert(visitorsTable)
        .values({
          invitation_id: invitationId,
          ip_address: encryptField(ipAddress),
          user_agent: encryptField(userAgent),
          referrer: referrer || null
        })
        .returning()
        .execute();

      // Update invitation view_count atomically
      await tx.update(invitationsTable)
        .set({
          view_count: sql`${invitationsTable.view_count} + 1`
        })
        .where(eq(invitationsTable.id, invitationId))
        .execute();

      const visitor = visitorResult[0];
      
      // Return visitor with original (unencrypted) fields for logging/response
      return {
        id: visitor.id,
        invitation_id: visitor.invitation_id,
        ip_address: ipAddress, // Return original for logging purposes
        user_agent: userAgent, // Return original for logging purposes
        referrer: visitor.referrer,
        visited_at: visitor.visited_at
      };
    });
  } catch (error) {
    console.error('Failed to log visitor:', error);
    throw error;
  }
}