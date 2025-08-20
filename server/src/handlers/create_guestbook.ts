import { db } from '../db';
import { guestbooksTable, invitationsTable } from '../db/schema';
import { type CreateGuestbookInput, type Guestbook } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createGuestbook = async (input: CreateGuestbookInput): Promise<Guestbook> => {
  try {
    // 1. Validate that invitation exists and is published
    const invitation = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, input.invitation_id))
      .execute();

    if (invitation.length === 0) {
      throw new Error('Invitation not found');
    }

    if (invitation[0].status !== 'published') {
      throw new Error('Invitation is not published');
    }

    // 2. Filter message content for inappropriate language (basic implementation)
    const inappropriateWords = ['spam', 'scam', 'fake', 'hate'];
    const lowerMessage = input.message.toLowerCase();
    const hasInappropriateContent = inappropriateWords.some(word => 
      lowerMessage.includes(word)
    );

    // 3. Set is_approved based on content filtering
    const isApproved = !hasInappropriateContent;

    // 4. Insert guestbook record
    const result = await db.insert(guestbooksTable)
      .values({
        invitation_id: input.invitation_id,
        guest_name: input.guest_name,
        message: input.message,
        is_approved: isApproved
      })
      .returning()
      .execute();

    // 5. Note: Notification to invitation owner would be implemented here
    // This could involve sending an email or creating a notification record

    // 6. Return created guestbook entry
    const guestbook = result[0];
    return {
      ...guestbook,
      created_at: guestbook.created_at
    };
  } catch (error) {
    console.error('Guestbook creation failed:', error);
    throw error;
  }
};