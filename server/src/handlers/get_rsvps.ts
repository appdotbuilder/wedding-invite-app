import { db } from '../db';
import { rsvpsTable } from '../db/schema';
import { type Rsvp } from '../schema';
import { eq } from 'drizzle-orm';

export async function getRsvpsByInvitation(invitationId: number): Promise<Rsvp[]> {
  try {
    const results = await db.select()
      .from(rsvpsTable)
      .where(eq(rsvpsTable.invitation_id, invitationId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch RSVPs for invitation:', error);
    throw error;
  }
}

export async function getRsvpStats(invitationId: number): Promise<{
  total: number;
  attending: number;
  notAttending: number;
  maybe: number;
  totalGuests: number;
}> {
  try {
    const results = await db.select()
      .from(rsvpsTable)
      .where(eq(rsvpsTable.invitation_id, invitationId))
      .execute();

    const stats = {
      total: results.length,
      attending: 0,
      notAttending: 0,
      maybe: 0,
      totalGuests: 0
    };

    for (const rsvp of results) {
      stats.totalGuests += rsvp.guest_count;
      
      switch (rsvp.status) {
        case 'attending':
          stats.attending++;
          break;
        case 'not_attending':
          stats.notAttending++;
          break;
        case 'maybe':
          stats.maybe++;
          break;
      }
    }

    return stats;
  } catch (error) {
    console.error('Failed to calculate RSVP stats for invitation:', error);
    throw error;
  }
}