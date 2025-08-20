import { db } from '../db';
import { invitationsTable, usersTable, paymentsTable, rsvpsTable, guestbooksTable, visitorsTable } from '../db/schema';
import { type UpdateInvitationInput, type Invitation } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export async function updateInvitation(input: UpdateInvitationInput): Promise<Invitation> {
  try {
    // First, verify the invitation exists and get current data
    const existingInvitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, input.id))
      .execute();

    if (existingInvitations.length === 0) {
      throw new Error('Invitation not found');
    }

    const existingInvitation = existingInvitations[0];

    // If slug is being changed, verify uniqueness
    if (input.slug && input.slug !== existingInvitation.slug) {
      const slugConflicts = await db.select()
        .from(invitationsTable)
        .where(and(
          eq(invitationsTable.slug, input.slug),
          ne(invitationsTable.id, input.id)
        ))
        .execute();

      if (slugConflicts.length > 0) {
        throw new Error('Slug already exists');
      }
    }

    // Validate wedding_data JSON if provided
    if (input.wedding_data) {
      try {
        JSON.parse(input.wedding_data);
      } catch (error) {
        throw new Error('Invalid wedding_data JSON format');
      }
    }

    // Prepare update data - only include fields that are provided
    const updateData: Partial<typeof invitationsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.status !== undefined) {
      updateData.status = input.status;
      // Set published_at when status changes to published
      if (input.status === 'published' && existingInvitation.status !== 'published') {
        updateData.published_at = new Date();
      }
    }
    if (input.wedding_data !== undefined) updateData.wedding_data = input.wedding_data;
    if (input.custom_css !== undefined) updateData.custom_css = input.custom_css;
    if (input.expires_at !== undefined) updateData.expires_at = input.expires_at;

    // Update the invitation
    const result = await db.update(invitationsTable)
      .set(updateData)
      .where(eq(invitationsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Invitation update failed:', error);
    throw error;
  }
}

export async function publishInvitation(invitationId: number): Promise<Invitation> {
  try {
    // Verify the invitation exists
    const invitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .execute();

    if (invitations.length === 0) {
      throw new Error('Invitation not found');
    }

    const invitation = invitations[0];

    // Verify payment has been completed for this invitation
    const completedPayments = await db.select()
      .from(paymentsTable)
      .where(and(
        eq(paymentsTable.invitation_id, invitationId),
        eq(paymentsTable.status, 'completed')
      ))
      .execute();

    if (completedPayments.length === 0) {
      throw new Error('No completed payment found for this invitation');
    }

    // Update status to published and set published_at
    const result = await db.update(invitationsTable)
      .set({
        status: 'published',
        published_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(invitationsTable.id, invitationId))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Invitation publish failed:', error);
    throw error;
  }
}

export async function deleteInvitation(invitationId: number, userId: number): Promise<boolean> {
  try {
    // Verify the invitation exists and belongs to the user
    const invitations = await db.select()
      .from(invitationsTable)
      .where(and(
        eq(invitationsTable.id, invitationId),
        eq(invitationsTable.user_id, userId)
      ))
      .execute();

    if (invitations.length === 0) {
      throw new Error('Invitation not found or access denied');
    }

    // Delete associated records in order (respecting foreign key constraints)
    
    // Delete visitors
    await db.delete(visitorsTable)
      .where(eq(visitorsTable.invitation_id, invitationId))
      .execute();

    // Delete guestbook entries
    await db.delete(guestbooksTable)
      .where(eq(guestbooksTable.invitation_id, invitationId))
      .execute();

    // Delete RSVPs
    await db.delete(rsvpsTable)
      .where(eq(rsvpsTable.invitation_id, invitationId))
      .execute();

    // Delete payments
    await db.delete(paymentsTable)
      .where(eq(paymentsTable.invitation_id, invitationId))
      .execute();

    // Finally, delete the invitation itself
    await db.delete(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .execute();

    return true;
  } catch (error) {
    console.error('Invitation deletion failed:', error);
    throw error;
  }
}