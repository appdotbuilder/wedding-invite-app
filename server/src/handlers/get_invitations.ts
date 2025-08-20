import { db } from '../db';
import { invitationsTable, usersTable, visitorsTable } from '../db/schema';
import { type Invitation } from '../schema';
import { eq, and, or, SQL } from 'drizzle-orm';

export async function getInvitations(userId?: number): Promise<Invitation[]> {
  try {
    if (!userId) {
      // Public access - return only published invitations
      const results = await db.select()
        .from(invitationsTable)
        .where(eq(invitationsTable.status, 'published'))
        .execute();

      return results;
    }

    // Get user's role to determine access level
    const userResults = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userResults.length === 0) {
      throw new Error('User not found');
    }

    const user = userResults[0];

    // Build query based on role
    if (user.role === 'super_admin') {
      // Super admin can see all invitations
      const results = await db.select()
        .from(invitationsTable)
        .execute();
      return results;
    } else if (user.role === 'user_mitra' || user.role === 'user_customer') {
      // Both mitra and customer can only see their own invitations
      const results = await db.select()
        .from(invitationsTable)
        .where(eq(invitationsTable.user_id, userId))
        .execute();
      return results;
    } else {
      // Default case - no access
      return [];
    }
  } catch (error) {
    console.error('Get invitations failed:', error);
    throw error;
  }
}

export async function getInvitationBySlug(slug: string): Promise<Invitation | null> {
  try {
    // Find invitation by slug
    const results = await db.select()
      .from(invitationsTable)
      .where(and(
        eq(invitationsTable.slug, slug),
        eq(invitationsTable.status, 'published')
      ))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const invitation = results[0];

    // Increment view_count
    await db.update(invitationsTable)
      .set({ view_count: invitation.view_count + 1 })
      .where(eq(invitationsTable.id, invitation.id))
      .execute();

    // Return updated invitation with incremented view count
    return {
      ...invitation,
      view_count: invitation.view_count + 1
    };
  } catch (error) {
    console.error('Get invitation by slug failed:', error);
    throw error;
  }
}

export async function getInvitationById(id: number, userId?: number): Promise<Invitation | null> {
  try {
    const results = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const invitation = results[0];

    // If no userId provided, only return if invitation is published (public access)
    if (!userId) {
      return invitation.status === 'published' ? invitation : null;
    }

    // Get user's role to verify permissions
    const userResults = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userResults.length === 0) {
      throw new Error('User not found');
    }

    const user = userResults[0];

    // Check permissions based on role
    if (user.role === 'super_admin') {
      // Super admin can access any invitation
      return invitation;
    } else if (user.role === 'user_mitra') {
      // User mitra can access invitations they created + customer associations
      // For now, just checking if they created it
      return invitation.user_id === userId ? invitation : null;
    } else if (user.role === 'user_customer') {
      // User customer can only access their own invitations
      return invitation.user_id === userId ? invitation : null;
    }

    return null;
  } catch (error) {
    console.error('Get invitation by ID failed:', error);
    throw error;
  }
}