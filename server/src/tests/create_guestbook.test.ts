import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { guestbooksTable, invitationsTable, usersTable, templatesTable } from '../db/schema';
import { type CreateGuestbookInput } from '../schema';
import { createGuestbook } from '../handlers/create_guestbook';
import { eq } from 'drizzle-orm';

describe('createGuestbook', () => {
  let testUserId: number;
  let testTemplateId: number;
  let testInvitationId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user_customer',
        status: 'active'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test template
    const templateResult = await db.insert(templatesTable)
      .values({
        name: 'Test Template',
        category: 'romantic',
        thumbnail_url: 'https://example.com/thumb.jpg',
        preview_url: 'https://example.com/preview.jpg',
        template_data: '{"theme": "romantic"}'
      })
      .returning()
      .execute();
    testTemplateId = templateResult[0].id;

    // Create test invitation (published)
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: testUserId,
        template_id: testTemplateId,
        title: 'Test Wedding',
        slug: 'test-wedding',
        status: 'published',
        wedding_data: '{"bride": "Jane", "groom": "John"}'
      })
      .returning()
      .execute();
    testInvitationId = invitationResult[0].id;
  });

  afterEach(resetDB);

  const testInput: CreateGuestbookInput = {
    invitation_id: 0, // Will be set in tests
    guest_name: 'Happy Guest',
    message: 'Congratulations on your wonderful wedding! Wishing you both a lifetime of happiness.'
  };

  it('should create a guestbook entry for published invitation', async () => {
    const input = { ...testInput, invitation_id: testInvitationId };
    const result = await createGuestbook(input);

    // Basic field validation
    expect(result.invitation_id).toEqual(testInvitationId);
    expect(result.guest_name).toEqual('Happy Guest');
    expect(result.message).toEqual(testInput.message);
    expect(result.is_approved).toEqual(true); // Clean message should be approved
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save guestbook entry to database', async () => {
    const input = { ...testInput, invitation_id: testInvitationId };
    const result = await createGuestbook(input);

    // Verify record in database
    const guestbooks = await db.select()
      .from(guestbooksTable)
      .where(eq(guestbooksTable.id, result.id))
      .execute();

    expect(guestbooks).toHaveLength(1);
    expect(guestbooks[0].invitation_id).toEqual(testInvitationId);
    expect(guestbooks[0].guest_name).toEqual('Happy Guest');
    expect(guestbooks[0].message).toEqual(testInput.message);
    expect(guestbooks[0].is_approved).toEqual(true);
    expect(guestbooks[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject inappropriate content and set is_approved to false', async () => {
    const input = {
      ...testInput,
      invitation_id: testInvitationId,
      message: 'This is spam content that should be filtered'
    };
    
    const result = await createGuestbook(input);

    expect(result.is_approved).toEqual(false);
    expect(result.message).toEqual(input.message); // Message is stored but not approved

    // Verify in database
    const guestbook = await db.select()
      .from(guestbooksTable)
      .where(eq(guestbooksTable.id, result.id))
      .execute();

    expect(guestbook[0].is_approved).toEqual(false);
  });

  it('should throw error when invitation does not exist', async () => {
    const input = { ...testInput, invitation_id: 99999 };

    await expect(createGuestbook(input)).rejects.toThrow(/invitation not found/i);
  });

  it('should throw error when invitation is not published', async () => {
    // Create draft invitation
    const draftInvitationResult = await db.insert(invitationsTable)
      .values({
        user_id: testUserId,
        template_id: testTemplateId,
        title: 'Draft Wedding',
        slug: 'draft-wedding',
        status: 'draft',
        wedding_data: '{"bride": "Jane", "groom": "John"}'
      })
      .returning()
      .execute();

    const input = { ...testInput, invitation_id: draftInvitationResult[0].id };

    await expect(createGuestbook(input)).rejects.toThrow(/invitation is not published/i);
  });

  it('should handle multiple inappropriate words correctly', async () => {
    const input = {
      ...testInput,
      invitation_id: testInvitationId,
      message: 'This fake scam message contains hate speech'
    };
    
    const result = await createGuestbook(input);

    expect(result.is_approved).toEqual(false);
  });

  it('should approve clean messages with appropriate content', async () => {
    const cleanMessages = [
      'Beautiful ceremony! Congratulations!',
      'Wishing you both endless love and happiness',
      'What a perfect day for a perfect couple'
    ];

    for (const message of cleanMessages) {
      const input = {
        ...testInput,
        invitation_id: testInvitationId,
        guest_name: `Guest ${Math.random()}`,
        message
      };
      
      const result = await createGuestbook(input);
      expect(result.is_approved).toEqual(true);
    }
  });

  it('should handle case-insensitive inappropriate content filtering', async () => {
    const input = {
      ...testInput,
      invitation_id: testInvitationId,
      message: 'This SPAM message should be filtered regardless of CASE'
    };
    
    const result = await createGuestbook(input);

    expect(result.is_approved).toEqual(false);
  });
});