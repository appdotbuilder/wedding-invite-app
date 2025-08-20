import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  templatesTable, 
  invitationsTable, 
  paymentsTable, 
  rsvpsTable, 
  guestbooksTable, 
  visitorsTable 
} from '../db/schema';
import { 
  type UpdateInvitationInput, 
  type CreateUserInput, 
  type CreateTemplateInput 
} from '../schema';
import { updateInvitation, publishInvitation, deleteInvitation } from '../handlers/update_invitation';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser: CreateUserInput = {
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  phone: '+1234567890',
  password: 'password123',
  role: 'user_customer'
};

const testTemplate: CreateTemplateInput = {
  name: 'Test Template',
  category: 'romantic',
  thumbnail_url: 'https://example.com/thumb.jpg',
  preview_url: 'https://example.com/preview.jpg',
  template_data: '{"design": "romantic-theme"}'
};

const baseInvitationData = {
  title: 'Original Wedding',
  slug: 'original-wedding',
  status: 'draft' as const,
  wedding_data: '{"bride": "Alice", "groom": "Bob"}',
  custom_css: '.custom { color: red; }',
  view_count: 0,
  rsvp_count: 0,
  published_at: null,
  expires_at: null
};

describe('updateInvitation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let templateId: number;
  let invitationId: number;

  beforeEach(async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create prerequisite template
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();
    templateId = templateResult[0].id;

    // Create base invitation
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: userId,
        template_id: templateId,
        ...baseInvitationData
      })
      .returning()
      .execute();
    invitationId = invitationResult[0].id;
  });

  it('should update invitation title', async () => {
    const updateInput: UpdateInvitationInput = {
      id: invitationId,
      title: 'Updated Wedding Title'
    };

    const result = await updateInvitation(updateInput);

    expect(result.id).toBe(invitationId);
    expect(result.title).toBe('Updated Wedding Title');
    expect(result.slug).toBe('original-wedding'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const dbInvitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .execute();

    expect(dbInvitations[0].title).toBe('Updated Wedding Title');
  });

  it('should update invitation slug with uniqueness validation', async () => {
    const updateInput: UpdateInvitationInput = {
      id: invitationId,
      slug: 'new-unique-slug'
    };

    const result = await updateInvitation(updateInput);

    expect(result.slug).toBe('new-unique-slug');

    // Verify in database
    const dbInvitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .execute();

    expect(dbInvitations[0].slug).toBe('new-unique-slug');
  });

  it('should reject duplicate slug', async () => {
    // Create another invitation with a different slug
    await db.insert(invitationsTable)
      .values({
        user_id: userId,
        template_id: templateId,
        title: 'Another Wedding',
        slug: 'another-wedding',
        status: 'draft',
        wedding_data: '{"bride": "Jane", "groom": "John"}',
        custom_css: null,
        view_count: 0,
        rsvp_count: 0,
        published_at: null,
        expires_at: null
      })
      .execute();

    const updateInput: UpdateInvitationInput = {
      id: invitationId,
      slug: 'another-wedding' // This should conflict
    };

    await expect(updateInvitation(updateInput)).rejects.toThrow(/slug already exists/i);
  });

  it('should update wedding_data and validate JSON', async () => {
    const newWeddingData = '{"bride": "Sarah", "groom": "Mike", "date": "2024-12-25"}';
    const updateInput: UpdateInvitationInput = {
      id: invitationId,
      wedding_data: newWeddingData
    };

    const result = await updateInvitation(updateInput);

    expect(result.wedding_data).toBe(newWeddingData);

    // Verify it's valid JSON
    const parsedData = JSON.parse(result.wedding_data);
    expect(parsedData.bride).toBe('Sarah');
    expect(parsedData.groom).toBe('Mike');
  });

  it('should reject invalid JSON in wedding_data', async () => {
    const updateInput: UpdateInvitationInput = {
      id: invitationId,
      wedding_data: '{"invalid": json}' // Invalid JSON
    };

    await expect(updateInvitation(updateInput)).rejects.toThrow(/invalid wedding_data json format/i);
  });

  it('should update status and set published_at when publishing', async () => {
    const updateInput: UpdateInvitationInput = {
      id: invitationId,
      status: 'published'
    };

    const result = await updateInvitation(updateInput);

    expect(result.status).toBe('published');
    expect(result.published_at).toBeInstanceOf(Date);
    expect(result.published_at).not.toBeNull();
  });

  it('should update multiple fields at once', async () => {
    const updateInput: UpdateInvitationInput = {
      id: invitationId,
      title: 'Complete Update',
      slug: 'complete-update',
      status: 'published',
      wedding_data: '{"updated": true}',
      custom_css: '.updated { color: blue; }',
      expires_at: new Date('2024-12-31')
    };

    const result = await updateInvitation(updateInput);

    expect(result.title).toBe('Complete Update');
    expect(result.slug).toBe('complete-update');
    expect(result.status).toBe('published');
    expect(result.wedding_data).toBe('{"updated": true}');
    expect(result.custom_css).toBe('.updated { color: blue; }');
    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.published_at).toBeInstanceOf(Date);
  });

  it('should handle null values correctly', async () => {
    const updateInput: UpdateInvitationInput = {
      id: invitationId,
      custom_css: null,
      expires_at: null
    };

    const result = await updateInvitation(updateInput);

    expect(result.custom_css).toBeNull();
    expect(result.expires_at).toBeNull();
  });

  it('should throw error for non-existent invitation', async () => {
    const updateInput: UpdateInvitationInput = {
      id: 99999, // Non-existent ID
      title: 'Should Fail'
    };

    await expect(updateInvitation(updateInput)).rejects.toThrow(/invitation not found/i);
  });
});

describe('publishInvitation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let templateId: number;
  let invitationId: number;

  beforeEach(async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create prerequisite template
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();
    templateId = templateResult[0].id;

    // Create base invitation
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: userId,
        template_id: templateId,
        ...baseInvitationData
      })
      .returning()
      .execute();
    invitationId = invitationResult[0].id;
  });

  it('should publish invitation with completed payment', async () => {
    // Create a completed payment first
    await db.insert(paymentsTable)
      .values({
        user_id: userId,
        invitation_id: invitationId,
        amount: '99.99',
        currency: 'USD',
        payment_method: 'credit_card',
        status: 'completed',
        transaction_id: 'txn_123'
      })
      .execute();

    const result = await publishInvitation(invitationId);

    expect(result.status).toBe('published');
    expect(result.published_at).toBeInstanceOf(Date);
    expect(result.published_at).not.toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should reject publishing without completed payment', async () => {
    // Create a pending payment (not completed)
    await db.insert(paymentsTable)
      .values({
        user_id: userId,
        invitation_id: invitationId,
        amount: '99.99',
        currency: 'USD',
        payment_method: 'credit_card',
        status: 'pending'
      })
      .execute();

    await expect(publishInvitation(invitationId)).rejects.toThrow(/no completed payment found/i);
  });

  it('should throw error for non-existent invitation', async () => {
    await expect(publishInvitation(99999)).rejects.toThrow(/invitation not found/i);
  });
});

describe('deleteInvitation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let otherUserId: number;
  let templateId: number;
  let invitationId: number;

  beforeEach(async () => {
    // Create prerequisite users
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    const otherUserResult = await db.insert(usersTable)
      .values({
        ...testUser,
        username: 'otheruser',
        email: 'other@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    otherUserId = otherUserResult[0].id;

    // Create prerequisite template
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();
    templateId = templateResult[0].id;

    // Create base invitation
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: userId,
        template_id: templateId,
        ...baseInvitationData
      })
      .returning()
      .execute();
    invitationId = invitationResult[0].id;
  });

  it('should delete invitation and all associated records', async () => {
    // Create associated records
    await db.insert(paymentsTable)
      .values({
        user_id: userId,
        invitation_id: invitationId,
        amount: '99.99',
        currency: 'USD',
        payment_method: 'credit_card',
        status: 'completed'
      })
      .execute();

    await db.insert(rsvpsTable)
      .values({
        invitation_id: invitationId,
        guest_name: 'John Doe',
        guest_email: 'john@example.com',
        guest_phone: '+1234567890',
        status: 'attending',
        guest_count: 2,
        message: 'Looking forward to it!'
      })
      .execute();

    await db.insert(guestbooksTable)
      .values({
        invitation_id: invitationId,
        guest_name: 'Jane Smith',
        message: 'Congratulations!',
        is_approved: true
      })
      .execute();

    await db.insert(visitorsTable)
      .values({
        invitation_id: invitationId,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        referrer: 'https://google.com'
      })
      .execute();

    const result = await deleteInvitation(invitationId, userId);

    expect(result).toBe(true);

    // Verify invitation is deleted
    const invitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .execute();
    expect(invitations).toHaveLength(0);

    // Verify associated records are deleted
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invitation_id, invitationId))
      .execute();
    expect(payments).toHaveLength(0);

    const rsvps = await db.select()
      .from(rsvpsTable)
      .where(eq(rsvpsTable.invitation_id, invitationId))
      .execute();
    expect(rsvps).toHaveLength(0);

    const guestbooks = await db.select()
      .from(guestbooksTable)
      .where(eq(guestbooksTable.invitation_id, invitationId))
      .execute();
    expect(guestbooks).toHaveLength(0);

    const visitors = await db.select()
      .from(visitorsTable)
      .where(eq(visitorsTable.invitation_id, invitationId))
      .execute();
    expect(visitors).toHaveLength(0);
  });

  it('should reject deletion by non-owner', async () => {
    await expect(deleteInvitation(invitationId, otherUserId)).rejects.toThrow(/invitation not found or access denied/i);

    // Verify invitation still exists
    const invitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .execute();
    expect(invitations).toHaveLength(1);
  });

  it('should throw error for non-existent invitation', async () => {
    await expect(deleteInvitation(99999, userId)).rejects.toThrow(/invitation not found or access denied/i);
  });
});