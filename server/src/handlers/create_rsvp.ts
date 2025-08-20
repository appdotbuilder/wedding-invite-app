import { db } from '../db';
import { rsvpsTable, invitationsTable } from '../db/schema';
import { type CreateRsvpInput, type Rsvp } from '../schema';
import { eq, and, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function createRsvp(input: CreateRsvpInput): Promise<Rsvp> {
  try {
    // 1. Validate that invitation exists and is published
    const invitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, input.invitation_id))
      .execute();

    if (invitations.length === 0) {
      throw new Error('Invitation not found');
    }

    const invitation = invitations[0];
    if (invitation.status !== 'published') {
      throw new Error('Invitation is not published');
    }

    // Check if invitation has expired
    if (invitation.expires_at && invitation.expires_at < new Date()) {
      throw new Error('Invitation has expired');
    }

    // 2. Check if guest has already responded (prevent duplicates)
    // Check by guest_name, guest_email, or guest_phone
    const conditions = [
      and(
        eq(rsvpsTable.invitation_id, input.invitation_id),
        eq(rsvpsTable.guest_name, input.guest_name)
      )
    ];

    if (input.guest_email) {
      conditions.push(
        and(
          eq(rsvpsTable.invitation_id, input.invitation_id),
          eq(rsvpsTable.guest_email, input.guest_email)
        )
      );
    }

    if (input.guest_phone) {
      conditions.push(
        and(
          eq(rsvpsTable.invitation_id, input.invitation_id),
          eq(rsvpsTable.guest_phone, input.guest_phone)
        )
      );
    }

    const existingRsvps = await db.select()
      .from(rsvpsTable)
      .where(or(...conditions))
      .execute();

    if (existingRsvps.length > 0) {
      throw new Error('Guest has already responded to this invitation');
    }

    // 3. Insert RSVP record
    const rsvpResult = await db.insert(rsvpsTable)
      .values({
        invitation_id: input.invitation_id,
        guest_name: input.guest_name,
        guest_email: input.guest_email,
        guest_phone: input.guest_phone,
        status: input.status,
        guest_count: input.guest_count,
        message: input.message
      })
      .returning()
      .execute();

    const createdRsvp = rsvpResult[0];

    // 4. Increment invitation's rsvp_count
    await db.update(invitationsTable)
      .set({
        rsvp_count: sql`${invitationsTable.rsvp_count} + 1`,
        updated_at: sql`now()`
      })
      .where(eq(invitationsTable.id, input.invitation_id))
      .execute();

    // 5. Return created RSVP
    return createdRsvp;
  } catch (error) {
    console.error('RSVP creation failed:', error);
    throw error;
  }
}