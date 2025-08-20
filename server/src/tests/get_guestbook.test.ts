import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, templatesTable, invitationsTable, guestbooksTable } from '../db/schema';
import { getGuestbookEntries, approveGuestbookEntry, deleteGuestbookEntry } from '../handlers/get_guestbook';
import { eq } from 'drizzle-orm';

describe('Guestbook Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let otherUserId: number;
  let templateId: number;
  let invitationId: number;
  let otherInvitationId: number;
  let guestbookEntryId: number;
  let approvedEntryId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable).values([
      {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user_customer',
        status: 'active'
      },
      {
        name: 'Other User',
        username: 'otheruser',
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        role: 'user_customer',
        status: 'active'
      }
    ]).returning().execute();

    userId = users[0].id;
    otherUserId = users[1].id;

    // Create template
    const templates = await db.insert(templatesTable).values({
      name: 'Test Template',
      category: 'contemporary',
      thumbnail_url: 'http://example.com/thumb.jpg',
      preview_url: 'http://example.com/preview.jpg',
      template_data: '{"layout": "standard"}'
    }).returning().execute();

    templateId = templates[0].id;

    // Create invitations
    const invitations = await db.insert(invitationsTable).values([
      {
        user_id: userId,
        template_id: templateId,
        title: 'Test Wedding',
        slug: 'test-wedding',
        wedding_data: '{"bride": "Jane", "groom": "John"}'
      },
      {
        user_id: otherUserId,
        template_id: templateId,
        title: 'Other Wedding',
        slug: 'other-wedding',
        wedding_data: '{"bride": "Alice", "groom": "Bob"}'
      }
    ]).returning().execute();

    invitationId = invitations[0].id;
    otherInvitationId = invitations[1].id;

    // Create guestbook entries
    const guestbookEntries = await db.insert(guestbooksTable).values([
      {
        invitation_id: invitationId,
        guest_name: 'Guest One',
        message: 'Congratulations!',
        is_approved: false
      },
      {
        invitation_id: invitationId,
        guest_name: 'Guest Two',
        message: 'Best wishes!',
        is_approved: true
      },
      {
        invitation_id: invitationId,
        guest_name: 'Guest Three',
        message: 'So happy for you both!',
        is_approved: false
      }
    ]).returning().execute();

    guestbookEntryId = guestbookEntries[0].id;
    approvedEntryId = guestbookEntries[1].id;
  });

  describe('getGuestbookEntries', () => {
    it('should return only approved entries by default', async () => {
      const entries = await getGuestbookEntries(invitationId);

      expect(entries).toHaveLength(1);
      expect(entries[0].guest_name).toEqual('Guest Two');
      expect(entries[0].message).toEqual('Best wishes!');
      expect(entries[0].is_approved).toBe(true);
    });

    it('should return all entries when includeUnapproved is true', async () => {
      const entries = await getGuestbookEntries(invitationId, true);

      expect(entries).toHaveLength(3);
      expect(entries.every(entry => entry.invitation_id === invitationId)).toBe(true);
      
      // Should include both approved and unapproved entries
      const approvedCount = entries.filter(entry => entry.is_approved).length;
      const unapprovedCount = entries.filter(entry => !entry.is_approved).length;
      expect(approvedCount).toBe(1);
      expect(unapprovedCount).toBe(2);
    });

    it('should order entries by creation date (newest first)', async () => {
      const entries = await getGuestbookEntries(invitationId, true);

      expect(entries).toHaveLength(3);
      // Verify descending order by checking timestamps
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].created_at >= entries[i + 1].created_at).toBe(true);
      }
    });

    it('should return empty array for invitation with no entries', async () => {
      const entries = await getGuestbookEntries(otherInvitationId);

      expect(entries).toHaveLength(0);
    });

    it('should return empty array for non-existent invitation', async () => {
      const entries = await getGuestbookEntries(99999);

      expect(entries).toHaveLength(0);
    });

    it('should verify all returned entries have correct structure', async () => {
      const entries = await getGuestbookEntries(invitationId, true);

      entries.forEach(entry => {
        expect(entry.id).toBeDefined();
        expect(typeof entry.invitation_id).toBe('number');
        expect(typeof entry.guest_name).toBe('string');
        expect(typeof entry.message).toBe('string');
        expect(typeof entry.is_approved).toBe('boolean');
        expect(entry.created_at).toBeInstanceOf(Date);
      });
    });
  });

  describe('approveGuestbookEntry', () => {
    it('should approve a guestbook entry successfully', async () => {
      const result = await approveGuestbookEntry(guestbookEntryId, userId);

      expect(result.id).toBe(guestbookEntryId);
      expect(result.is_approved).toBe(true);
      expect(result.guest_name).toEqual('Guest One');
      expect(result.message).toEqual('Congratulations!');

      // Verify it's actually updated in database
      const entries = await db.select()
        .from(guestbooksTable)
        .where(eq(guestbooksTable.id, guestbookEntryId))
        .execute();

      expect(entries[0].is_approved).toBe(true);
    });

    it('should throw error when user does not own invitation', async () => {
      expect(approveGuestbookEntry(guestbookEntryId, otherUserId))
        .rejects.toThrow(/does not own this invitation/i);
    });

    it('should throw error for non-existent guestbook entry', async () => {
      expect(approveGuestbookEntry(99999, userId))
        .rejects.toThrow(/not found/i);
    });

    it('should work for already approved entries', async () => {
      const result = await approveGuestbookEntry(approvedEntryId, userId);

      expect(result.id).toBe(approvedEntryId);
      expect(result.is_approved).toBe(true);
    });

    it('should maintain other entry data when approving', async () => {
      const originalEntry = await db.select()
        .from(guestbooksTable)
        .where(eq(guestbooksTable.id, guestbookEntryId))
        .execute();

      const result = await approveGuestbookEntry(guestbookEntryId, userId);

      expect(result.guest_name).toEqual(originalEntry[0].guest_name);
      expect(result.message).toEqual(originalEntry[0].message);
      expect(result.invitation_id).toBe(originalEntry[0].invitation_id);
      expect(result.created_at).toEqual(originalEntry[0].created_at);
    });
  });

  describe('deleteGuestbookEntry', () => {
    it('should delete a guestbook entry successfully', async () => {
      const result = await deleteGuestbookEntry(guestbookEntryId, userId);

      expect(result).toBe(true);

      // Verify it's actually deleted from database
      const entries = await db.select()
        .from(guestbooksTable)
        .where(eq(guestbooksTable.id, guestbookEntryId))
        .execute();

      expect(entries).toHaveLength(0);
    });

    it('should throw error when user does not own invitation', async () => {
      expect(deleteGuestbookEntry(guestbookEntryId, otherUserId))
        .rejects.toThrow(/does not own this invitation/i);
    });

    it('should throw error for non-existent guestbook entry', async () => {
      expect(deleteGuestbookEntry(99999, userId))
        .rejects.toThrow(/not found/i);
    });

    it('should return false when entry already deleted', async () => {
      // Delete the entry first
      await deleteGuestbookEntry(guestbookEntryId, userId);

      // Try to delete again
      expect(deleteGuestbookEntry(guestbookEntryId, userId))
        .rejects.toThrow(/not found/i);
    });

    it('should delete approved entries', async () => {
      const result = await deleteGuestbookEntry(approvedEntryId, userId);

      expect(result).toBe(true);

      // Verify deletion
      const entries = await db.select()
        .from(guestbooksTable)
        .where(eq(guestbooksTable.id, approvedEntryId))
        .execute();

      expect(entries).toHaveLength(0);
    });

    it('should not affect other entries when deleting one', async () => {
      const entriesBeforeDeletion = await getGuestbookEntries(invitationId, true);
      const initialCount = entriesBeforeDeletion.length;

      await deleteGuestbookEntry(guestbookEntryId, userId);

      const entriesAfterDeletion = await getGuestbookEntries(invitationId, true);
      expect(entriesAfterDeletion).toHaveLength(initialCount - 1);

      // Verify the specific entry is gone but others remain
      const deletedEntryExists = entriesAfterDeletion.some(entry => entry.id === guestbookEntryId);
      expect(deletedEntryExists).toBe(false);

      const otherEntriesExist = entriesAfterDeletion.some(entry => entry.id === approvedEntryId);
      expect(otherEntriesExist).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete guestbook moderation workflow', async () => {
      // 1. Get all entries for moderation
      const allEntries = await getGuestbookEntries(invitationId, true);
      expect(allEntries).toHaveLength(3);

      // 2. Approve an unapproved entry
      await approveGuestbookEntry(guestbookEntryId, userId);

      // 3. Check public view now shows the approved entry
      const publicEntries = await getGuestbookEntries(invitationId, false);
      expect(publicEntries).toHaveLength(2);

      // 4. Delete an inappropriate entry
      const inappropriateEntryId = allEntries.find(entry => 
        entry.guest_name === 'Guest Three'
      )?.id;
      
      if (inappropriateEntryId) {
        await deleteGuestbookEntry(inappropriateEntryId, userId);
      }

      // 5. Final count should be reduced
      const finalEntries = await getGuestbookEntries(invitationId, true);
      expect(finalEntries).toHaveLength(2);
    });

    it('should handle multiple invitations correctly', async () => {
      // Add entry to other invitation
      await db.insert(guestbooksTable).values({
        invitation_id: otherInvitationId,
        guest_name: 'Other Guest',
        message: 'Different wedding message',
        is_approved: true
      }).execute();

      // Entries should be separated by invitation
      const invitation1Entries = await getGuestbookEntries(invitationId, true);
      const invitation2Entries = await getGuestbookEntries(otherInvitationId, true);

      expect(invitation1Entries).toHaveLength(3);
      expect(invitation2Entries).toHaveLength(1);
      expect(invitation2Entries[0].guest_name).toEqual('Other Guest');
    });
  });
});