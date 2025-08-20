import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, templatesTable, invitationsTable, rsvpsTable } from '../db/schema';
import { getRsvpsByInvitation, getRsvpStats } from '../handlers/get_rsvps';

describe('getRsvpsByInvitation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no RSVPs exist', async () => {
    const result = await getRsvpsByInvitation(999);
    expect(result).toEqual([]);
  });

  it('should return RSVPs for specific invitation', async () => {
    // Create prerequisite data
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

    const templateResult = await db.insert(templatesTable)
      .values({
        name: 'Test Template',
        category: 'romantic',
        thumbnail_url: 'http://example.com/thumb.jpg',
        preview_url: 'http://example.com/preview.jpg',
        template_data: '{"design": "romantic"}'
      })
      .returning()
      .execute();

    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: userResult[0].id,
        template_id: templateResult[0].id,
        title: 'Test Invitation',
        slug: 'test-invitation',
        wedding_data: '{"bride": "Jane", "groom": "John"}'
      })
      .returning()
      .execute();

    // Create RSVPs for this invitation
    await db.insert(rsvpsTable)
      .values([
        {
          invitation_id: invitationResult[0].id,
          guest_name: 'Guest One',
          guest_email: 'guest1@example.com',
          status: 'attending',
          guest_count: 2
        },
        {
          invitation_id: invitationResult[0].id,
          guest_name: 'Guest Two',
          status: 'not_attending',
          guest_count: 1
        }
      ])
      .execute();

    // Create RSVP for different invitation (should not be returned)
    const otherInvitationResult = await db.insert(invitationsTable)
      .values({
        user_id: userResult[0].id,
        template_id: templateResult[0].id,
        title: 'Other Invitation',
        slug: 'other-invitation',
        wedding_data: '{"bride": "Alice", "groom": "Bob"}'
      })
      .returning()
      .execute();

    await db.insert(rsvpsTable)
      .values({
        invitation_id: otherInvitationResult[0].id,
        guest_name: 'Other Guest',
        status: 'attending',
        guest_count: 1
      })
      .execute();

    const result = await getRsvpsByInvitation(invitationResult[0].id);

    expect(result).toHaveLength(2);
    expect(result[0].guest_name).toBe('Guest One');
    expect(result[0].guest_email).toBe('guest1@example.com');
    expect(result[0].status).toBe('attending');
    expect(result[0].guest_count).toBe(2);
    expect(result[0].invitation_id).toBe(invitationResult[0].id);

    expect(result[1].guest_name).toBe('Guest Two');
    expect(result[1].status).toBe('not_attending');
    expect(result[1].guest_count).toBe(1);
    expect(result[1].invitation_id).toBe(invitationResult[0].id);
  });

  it('should include all RSVP fields', async () => {
    // Create prerequisite data
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

    const templateResult = await db.insert(templatesTable)
      .values({
        name: 'Test Template',
        category: 'romantic',
        thumbnail_url: 'http://example.com/thumb.jpg',
        preview_url: 'http://example.com/preview.jpg',
        template_data: '{"design": "romantic"}'
      })
      .returning()
      .execute();

    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: userResult[0].id,
        template_id: templateResult[0].id,
        title: 'Test Invitation',
        slug: 'test-invitation',
        wedding_data: '{"bride": "Jane", "groom": "John"}'
      })
      .returning()
      .execute();

    await db.insert(rsvpsTable)
      .values({
        invitation_id: invitationResult[0].id,
        guest_name: 'Complete Guest',
        guest_email: 'complete@example.com',
        guest_phone: '+1234567890',
        status: 'maybe',
        guest_count: 3,
        message: 'Looking forward to it!'
      })
      .execute();

    const result = await getRsvpsByInvitation(invitationResult[0].id);

    expect(result).toHaveLength(1);
    const rsvp = result[0];
    expect(rsvp.id).toBeDefined();
    expect(rsvp.invitation_id).toBe(invitationResult[0].id);
    expect(rsvp.guest_name).toBe('Complete Guest');
    expect(rsvp.guest_email).toBe('complete@example.com');
    expect(rsvp.guest_phone).toBe('+1234567890');
    expect(rsvp.status).toBe('maybe');
    expect(rsvp.guest_count).toBe(3);
    expect(rsvp.message).toBe('Looking forward to it!');
    expect(rsvp.created_at).toBeInstanceOf(Date);
  });
});

describe('getRsvpStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats when no RSVPs exist', async () => {
    const result = await getRsvpStats(999);

    expect(result).toEqual({
      total: 0,
      attending: 0,
      notAttending: 0,
      maybe: 0,
      totalGuests: 0
    });
  });

  it('should calculate correct statistics', async () => {
    // Create prerequisite data
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

    const templateResult = await db.insert(templatesTable)
      .values({
        name: 'Test Template',
        category: 'romantic',
        thumbnail_url: 'http://example.com/thumb.jpg',
        preview_url: 'http://example.com/preview.jpg',
        template_data: '{"design": "romantic"}'
      })
      .returning()
      .execute();

    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: userResult[0].id,
        template_id: templateResult[0].id,
        title: 'Test Invitation',
        slug: 'test-invitation',
        wedding_data: '{"bride": "Jane", "groom": "John"}'
      })
      .returning()
      .execute();

    // Create RSVPs with different statuses
    await db.insert(rsvpsTable)
      .values([
        {
          invitation_id: invitationResult[0].id,
          guest_name: 'Attending Guest 1',
          status: 'attending',
          guest_count: 2
        },
        {
          invitation_id: invitationResult[0].id,
          guest_name: 'Attending Guest 2',
          status: 'attending',
          guest_count: 3
        },
        {
          invitation_id: invitationResult[0].id,
          guest_name: 'Not Attending Guest',
          status: 'not_attending',
          guest_count: 1
        },
        {
          invitation_id: invitationResult[0].id,
          guest_name: 'Maybe Guest',
          status: 'maybe',
          guest_count: 4
        }
      ])
      .execute();

    const result = await getRsvpStats(invitationResult[0].id);

    expect(result.total).toBe(4);
    expect(result.attending).toBe(2);
    expect(result.notAttending).toBe(1);
    expect(result.maybe).toBe(1);
    expect(result.totalGuests).toBe(10); // 2 + 3 + 1 + 4
  });

  it('should only count RSVPs for specific invitation', async () => {
    // Create prerequisite data
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

    const templateResult = await db.insert(templatesTable)
      .values({
        name: 'Test Template',
        category: 'romantic',
        thumbnail_url: 'http://example.com/thumb.jpg',
        preview_url: 'http://example.com/preview.jpg',
        template_data: '{"design": "romantic"}'
      })
      .returning()
      .execute();

    // Create two invitations
    const invitation1Result = await db.insert(invitationsTable)
      .values({
        user_id: userResult[0].id,
        template_id: templateResult[0].id,
        title: 'First Invitation',
        slug: 'first-invitation',
        wedding_data: '{"bride": "Jane", "groom": "John"}'
      })
      .returning()
      .execute();

    const invitation2Result = await db.insert(invitationsTable)
      .values({
        user_id: userResult[0].id,
        template_id: templateResult[0].id,
        title: 'Second Invitation',
        slug: 'second-invitation',
        wedding_data: '{"bride": "Alice", "groom": "Bob"}'
      })
      .returning()
      .execute();

    // Create RSVPs for first invitation
    await db.insert(rsvpsTable)
      .values([
        {
          invitation_id: invitation1Result[0].id,
          guest_name: 'Guest 1',
          status: 'attending',
          guest_count: 2
        },
        {
          invitation_id: invitation1Result[0].id,
          guest_name: 'Guest 2',
          status: 'not_attending',
          guest_count: 1
        }
      ])
      .execute();

    // Create RSVP for second invitation (should not affect first invitation stats)
    await db.insert(rsvpsTable)
      .values({
        invitation_id: invitation2Result[0].id,
        guest_name: 'Other Guest',
        status: 'attending',
        guest_count: 5
      })
      .execute();

    const result = await getRsvpStats(invitation1Result[0].id);

    expect(result.total).toBe(2);
    expect(result.attending).toBe(1);
    expect(result.notAttending).toBe(1);
    expect(result.maybe).toBe(0);
    expect(result.totalGuests).toBe(3); // 2 + 1
  });

  it('should handle single status correctly', async () => {
    // Create prerequisite data
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

    const templateResult = await db.insert(templatesTable)
      .values({
        name: 'Test Template',
        category: 'romantic',
        thumbnail_url: 'http://example.com/thumb.jpg',
        preview_url: 'http://example.com/preview.jpg',
        template_data: '{"design": "romantic"}'
      })
      .returning()
      .execute();

    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: userResult[0].id,
        template_id: templateResult[0].id,
        title: 'Test Invitation',
        slug: 'test-invitation',
        wedding_data: '{"bride": "Jane", "groom": "John"}'
      })
      .returning()
      .execute();

    // Create only "maybe" RSVPs
    await db.insert(rsvpsTable)
      .values([
        {
          invitation_id: invitationResult[0].id,
          guest_name: 'Maybe Guest 1',
          status: 'maybe',
          guest_count: 1
        },
        {
          invitation_id: invitationResult[0].id,
          guest_name: 'Maybe Guest 2',
          status: 'maybe',
          guest_count: 2
        }
      ])
      .execute();

    const result = await getRsvpStats(invitationResult[0].id);

    expect(result.total).toBe(2);
    expect(result.attending).toBe(0);
    expect(result.notAttending).toBe(0);
    expect(result.maybe).toBe(2);
    expect(result.totalGuests).toBe(3);
  });
});