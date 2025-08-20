import { db } from '../db';
import { guestbooksTable, invitationsTable } from '../db/schema';
import { type Guestbook } from '../schema';
import { eq, and, desc, type SQL } from 'drizzle-orm';

export async function getGuestbookEntries(invitationId: number, includeUnapproved: boolean = false): Promise<Guestbook[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [eq(guestbooksTable.invitation_id, invitationId)];

    // Filter by approval status if needed
    if (!includeUnapproved) {
      conditions.push(eq(guestbooksTable.is_approved, true));
    }

    // Build final query
    const query = db.select()
      .from(guestbooksTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(guestbooksTable.created_at));

    const results = await query.execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch guestbook entries:', error);
    throw error;
  }
}

export async function approveGuestbookEntry(entryId: number, userId: number): Promise<Guestbook> {
  try {
    // First verify that the user owns the invitation associated with this guestbook entry
    const guestbookWithInvitation = await db.select({
      guestbook_user_id: invitationsTable.user_id,
      entry_id: guestbooksTable.id
    })
      .from(guestbooksTable)
      .innerJoin(invitationsTable, eq(guestbooksTable.invitation_id, invitationsTable.id))
      .where(eq(guestbooksTable.id, entryId))
      .execute();

    if (guestbookWithInvitation.length === 0) {
      throw new Error('Guestbook entry not found');
    }

    if (guestbookWithInvitation[0].guestbook_user_id !== userId) {
      throw new Error('User does not own this invitation');
    }

    // Update the entry to approved
    const result = await db.update(guestbooksTable)
      .set({ is_approved: true })
      .where(eq(guestbooksTable.id, entryId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to approve guestbook entry');
    }

    return result[0];
  } catch (error) {
    console.error('Failed to approve guestbook entry:', error);
    throw error;
  }
}

export async function deleteGuestbookEntry(entryId: number, userId: number): Promise<boolean> {
  try {
    // First verify that the user owns the invitation associated with this guestbook entry
    const guestbookWithInvitation = await db.select({
      guestbook_user_id: invitationsTable.user_id,
      entry_id: guestbooksTable.id
    })
      .from(guestbooksTable)
      .innerJoin(invitationsTable, eq(guestbooksTable.invitation_id, invitationsTable.id))
      .where(eq(guestbooksTable.id, entryId))
      .execute();

    if (guestbookWithInvitation.length === 0) {
      throw new Error('Guestbook entry not found');
    }

    if (guestbookWithInvitation[0].guestbook_user_id !== userId) {
      throw new Error('User does not own this invitation');
    }

    // Delete the entry and check if any rows were affected
    await db.delete(guestbooksTable)
      .where(eq(guestbooksTable.id, entryId))
      .execute();

    // Verify the entry was actually deleted
    const checkDeleted = await db.select()
      .from(guestbooksTable)
      .where(eq(guestbooksTable.id, entryId))
      .execute();

    return checkDeleted.length === 0;
  } catch (error) {
    console.error('Failed to delete guestbook entry:', error);
    throw error;
  }
}