import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, templatesTable, invitationsTable, rsvpsTable } from '../db/schema';
import { type CreateRsvpInput } from '../schema';
import { createRsvp } from '../handlers/create_rsvp';
import { eq } from 'drizzle-orm';

describe('createRsvp', () => {
  let testUserId: number;
  let testTemplateId: number;
  let testInvitationId: number;
  let expiredInvitationId: number;
  let draftInvitationId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
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
        template_data: '{"layout": "standard"}'
      })
      .returning()
      .execute();
    testTemplateId = templateResult[0].id;

    // Create published invitation
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: testUserId,
        template_id: testTemplateId,
        title: 'Test Wedding',
        slug: 'test-wedding',
        status: 'published',
        wedding_data: '{"bride": "Alice", "groom": "Bob"}',
        rsvp_count: 0
      })
      .returning()
      .execute();
    testInvitationId = invitationResult[0].id;

    // Create expired invitation
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday
    const expiredResult = await db.insert(invitationsTable)
      .values({
        user_id: testUserId,
        template_id: testTemplateId,
        title: 'Expired Wedding',
        slug: 'expired-wedding',
        status: 'published',
        wedding_data: '{"bride": "Alice", "groom": "Bob"}',
        expires_at: expiredDate,
        rsvp_count: 0
      })
      .returning()
      .execute();
    expiredInvitationId = expiredResult[0].id;

    // Create draft invitation
    const draftResult = await db.insert(invitationsTable)
      .values({
        user_id: testUserId,
        template_id: testTemplateId,
        title: 'Draft Wedding',
        slug: 'draft-wedding',
        status: 'draft',
        wedding_data: '{"bride": "Alice", "groom": "Bob"}',
        rsvp_count: 0
      })
      .returning()
      .execute();
    draftInvitationId = draftResult[0].id;
  });

  afterEach(resetDB);

  const testInput: CreateRsvpInput = {
    invitation_id: 0, // Will be set in tests
    guest_name: 'John Doe',
    guest_email: 'john@example.com',
    guest_phone: '+1234567890',
    status: 'attending',
    guest_count: 2,
    message: 'Looking forward to the celebration!'
  };

  it('should create an RSVP successfully', async () => {
    const input = { ...testInput, invitation_id: testInvitationId };
    const result = await createRsvp(input);

    // Verify RSVP fields
    expect(result.invitation_id).toEqual(testInvitationId);
    expect(result.guest_name).toEqual('John Doe');
    expect(result.guest_email).toEqual('john@example.com');
    expect(result.guest_phone).toEqual('+1234567890');
    expect(result.status).toEqual('attending');
    expect(result.guest_count).toEqual(2);
    expect(result.message).toEqual('Looking forward to the celebration!');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save RSVP to database', async () => {
    const input = { ...testInput, invitation_id: testInvitationId };
    const result = await createRsvp(input);

    const savedRsvps = await db.select()
      .from(rsvpsTable)
      .where(eq(rsvpsTable.id, result.id))
      .execute();

    expect(savedRsvps).toHaveLength(1);
    expect(savedRsvps[0].guest_name).toEqual('John Doe');
    expect(savedRsvps[0].guest_email).toEqual('john@example.com');
    expect(savedRsvps[0].status).toEqual('attending');
  });

  it('should increment invitation rsvp_count', async () => {
    const input = { ...testInput, invitation_id: testInvitationId };
    
    // Check initial count
    let invitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, testInvitationId))
      .execute();
    expect(invitations[0].rsvp_count).toEqual(0);

    await createRsvp(input);

    // Check updated count
    invitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, testInvitationId))
      .execute();
    expect(invitations[0].rsvp_count).toEqual(1);
  });

  it('should handle RSVP with minimal data', async () => {
    const minimalInput: CreateRsvpInput = {
      invitation_id: testInvitationId,
      guest_name: 'Jane Smith',
      guest_email: null,
      guest_phone: null,
      status: 'not_attending',
      guest_count: 1,
      message: null
    };

    const result = await createRsvp(minimalInput);

    expect(result.guest_name).toEqual('Jane Smith');
    expect(result.guest_email).toBeNull();
    expect(result.guest_phone).toBeNull();
    expect(result.status).toEqual('not_attending');
    expect(result.guest_count).toEqual(1);
    expect(result.message).toBeNull();
  });

  it('should throw error for non-existent invitation', async () => {
    const input = { ...testInput, invitation_id: 99999 };

    await expect(createRsvp(input)).rejects.toThrow(/invitation not found/i);
  });

  it('should throw error for unpublished invitation', async () => {
    const input = { ...testInput, invitation_id: draftInvitationId };

    await expect(createRsvp(input)).rejects.toThrow(/invitation is not published/i);
  });

  it('should throw error for expired invitation', async () => {
    const input = { ...testInput, invitation_id: expiredInvitationId };

    await expect(createRsvp(input)).rejects.toThrow(/invitation has expired/i);
  });

  it('should prevent duplicate RSVPs by guest name', async () => {
    const input = { ...testInput, invitation_id: testInvitationId };

    // Create first RSVP
    await createRsvp(input);

    // Try to create duplicate
    await expect(createRsvp(input)).rejects.toThrow(/guest has already responded/i);
  });

  it('should prevent duplicate RSVPs by email', async () => {
    const input1 = { 
      ...testInput, 
      invitation_id: testInvitationId,
      guest_name: 'First Guest'
    };
    const input2 = { 
      ...testInput, 
      invitation_id: testInvitationId,
      guest_name: 'Second Guest' // Different name, same email
    };

    // Create first RSVP
    await createRsvp(input1);

    // Try to create RSVP with same email
    await expect(createRsvp(input2)).rejects.toThrow(/guest has already responded/i);
  });

  it('should prevent duplicate RSVPs by phone', async () => {
    const input1 = { 
      ...testInput, 
      invitation_id: testInvitationId,
      guest_name: 'First Guest',
      guest_email: 'first@example.com'
    };
    const input2 = { 
      ...testInput, 
      invitation_id: testInvitationId,
      guest_name: 'Second Guest',
      guest_email: 'second@example.com' // Different email, same phone
    };

    // Create first RSVP
    await createRsvp(input1);

    // Try to create RSVP with same phone
    await expect(createRsvp(input2)).rejects.toThrow(/guest has already responded/i);
  });

  it('should allow same guest to RSVP to different invitations', async () => {
    // Create second published invitation
    const invitation2Result = await db.insert(invitationsTable)
      .values({
        user_id: testUserId,
        template_id: testTemplateId,
        title: 'Second Wedding',
        slug: 'second-wedding',
        status: 'published',
        wedding_data: '{"bride": "Carol", "groom": "Dave"}',
        rsvp_count: 0
      })
      .returning()
      .execute();

    const input1 = { ...testInput, invitation_id: testInvitationId };
    const input2 = { ...testInput, invitation_id: invitation2Result[0].id };

    // Should be able to RSVP to both invitations
    const rsvp1 = await createRsvp(input1);
    const rsvp2 = await createRsvp(input2);

    expect(rsvp1.invitation_id).toEqual(testInvitationId);
    expect(rsvp2.invitation_id).toEqual(invitation2Result[0].id);
    expect(rsvp1.guest_name).toEqual(rsvp2.guest_name);
  });

  it('should handle different RSVP statuses correctly', async () => {
    // Create additional invitations for different status tests
    const invitation2Result = await db.insert(invitationsTable)
      .values({
        user_id: testUserId,
        template_id: testTemplateId,
        title: 'Second Wedding',
        slug: 'second-wedding-status',
        status: 'published',
        wedding_data: '{"bride": "Carol", "groom": "Dave"}',
        rsvp_count: 0
      })
      .returning()
      .execute();

    const invitation3Result = await db.insert(invitationsTable)
      .values({
        user_id: testUserId,
        template_id: testTemplateId,
        title: 'Third Wedding',
        slug: 'third-wedding-status',
        status: 'published',
        wedding_data: '{"bride": "Eve", "groom": "Frank"}',
        rsvp_count: 0
      })
      .returning()
      .execute();

    const attendingInput = { 
      ...testInput, 
      invitation_id: testInvitationId,
      guest_name: 'Attending Guest',
      guest_email: 'attending@example.com',
      status: 'attending' as const
    };

    const notAttendingInput = { 
      ...testInput, 
      invitation_id: invitation2Result[0].id,
      guest_name: 'Not Attending Guest',
      guest_email: 'notattending@example.com',
      status: 'not_attending' as const
    };

    const maybeInput = { 
      ...testInput, 
      invitation_id: invitation3Result[0].id,
      guest_name: 'Maybe Guest',
      guest_email: 'maybe@example.com',
      status: 'maybe' as const
    };

    const rsvp1 = await createRsvp(attendingInput);
    const rsvp2 = await createRsvp(notAttendingInput);
    const rsvp3 = await createRsvp(maybeInput);

    expect(rsvp1.status).toEqual('attending');
    expect(rsvp2.status).toEqual('not_attending');
    expect(rsvp3.status).toEqual('maybe');
  });
});