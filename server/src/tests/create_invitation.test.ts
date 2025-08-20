import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, templatesTable, invitationsTable } from '../db/schema';
import { type CreateInvitationInput } from '../schema';
import { createInvitation, checkSlugAvailability } from '../handlers/create_invitation';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  phone: null,
  password_hash: 'hashedpassword',
  role: 'user_customer' as const,
  status: 'active' as const
};

const testTemplate = {
  name: 'Romantic Template',
  category: 'romantic' as const,
  thumbnail_url: 'https://example.com/thumb.jpg',
  preview_url: 'https://example.com/preview.jpg',
  template_data: '{"layout": "modern", "colors": ["#fff", "#000"]}',
  is_active: true
};

const weddingData = {
  bride: 'Jane Doe',
  groom: 'John Smith',
  wedding_date: '2024-06-15',
  venue: 'Grand Hotel'
};

describe('createInvitation', () => {
  let userId: number;
  let templateId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test template
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();
    templateId = templateResult[0].id;
  });

  afterEach(resetDB);

  it('should create an invitation successfully', async () => {
    const testInput: CreateInvitationInput = {
      user_id: userId,
      template_id: templateId,
      title: 'John & Jane Wedding',
      slug: 'john-jane-wedding',
      wedding_data: JSON.stringify(weddingData),
      custom_css: '.custom { color: red; }',
      expires_at: new Date('2024-12-31')
    };

    const result = await createInvitation(testInput);

    // Verify returned invitation
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.template_id).toEqual(templateId);
    expect(result.title).toEqual('John & Jane Wedding');
    expect(result.slug).toEqual('john-jane-wedding');
    expect(result.status).toEqual('draft');
    expect(result.wedding_data).toEqual(JSON.stringify(weddingData));
    expect(result.custom_css).toEqual('.custom { color: red; }');
    expect(result.view_count).toEqual(0);
    expect(result.rsvp_count).toEqual(0);
    expect(result.published_at).toBeNull();
    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save invitation to database correctly', async () => {
    const testInput: CreateInvitationInput = {
      user_id: userId,
      template_id: templateId,
      title: 'Database Test Wedding',
      slug: 'db-test-wedding',
      wedding_data: JSON.stringify(weddingData),
      custom_css: null,
      expires_at: null
    };

    const result = await createInvitation(testInput);

    // Verify in database
    const savedInvitation = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, result.id))
      .execute();

    expect(savedInvitation).toHaveLength(1);
    expect(savedInvitation[0].title).toEqual('Database Test Wedding');
    expect(savedInvitation[0].slug).toEqual('db-test-wedding');
    expect(savedInvitation[0].status).toEqual('draft');
    expect(savedInvitation[0].custom_css).toBeNull();
    expect(savedInvitation[0].expires_at).toBeNull();
  });

  it('should reject duplicate slugs', async () => {
    const testInput: CreateInvitationInput = {
      user_id: userId,
      template_id: templateId,
      title: 'First Wedding',
      slug: 'duplicate-slug',
      wedding_data: JSON.stringify(weddingData),
      custom_css: null,
      expires_at: null
    };

    // Create first invitation
    await createInvitation(testInput);

    // Try to create second with same slug
    const duplicateInput: CreateInvitationInput = {
      ...testInput,
      title: 'Second Wedding'
    };

    await expect(createInvitation(duplicateInput))
      .rejects.toThrow(/slug.*already taken/i);
  });

  it('should reject invitation for non-existent user', async () => {
    const testInput: CreateInvitationInput = {
      user_id: 99999,
      template_id: templateId,
      title: 'Invalid User Wedding',
      slug: 'invalid-user-wedding',
      wedding_data: JSON.stringify(weddingData),
      custom_css: null,
      expires_at: null
    };

    await expect(createInvitation(testInput))
      .rejects.toThrow(/user not found/i);
  });

  it('should reject invitation for inactive user', async () => {
    // Create inactive user
    const inactiveUser = {
      ...testUser,
      username: 'inactiveuser',
      email: 'inactive@example.com',
      status: 'suspended' as const
    };

    const inactiveUserResult = await db.insert(usersTable)
      .values(inactiveUser)
      .returning()
      .execute();

    const testInput: CreateInvitationInput = {
      user_id: inactiveUserResult[0].id,
      template_id: templateId,
      title: 'Inactive User Wedding',
      slug: 'inactive-user-wedding',
      wedding_data: JSON.stringify(weddingData),
      custom_css: null,
      expires_at: null
    };

    await expect(createInvitation(testInput))
      .rejects.toThrow(/user must be active/i);
  });

  it('should reject invitation for non-existent template', async () => {
    const testInput: CreateInvitationInput = {
      user_id: userId,
      template_id: 99999,
      title: 'Invalid Template Wedding',
      slug: 'invalid-template-wedding',
      wedding_data: JSON.stringify(weddingData),
      custom_css: null,
      expires_at: null
    };

    await expect(createInvitation(testInput))
      .rejects.toThrow(/template not found/i);
  });

  it('should reject invitation for inactive template', async () => {
    // Create inactive template
    const inactiveTemplate = {
      ...testTemplate,
      name: 'Inactive Template',
      is_active: false
    };

    const inactiveTemplateResult = await db.insert(templatesTable)
      .values(inactiveTemplate)
      .returning()
      .execute();

    const testInput: CreateInvitationInput = {
      user_id: userId,
      template_id: inactiveTemplateResult[0].id,
      title: 'Inactive Template Wedding',
      slug: 'inactive-template-wedding',
      wedding_data: JSON.stringify(weddingData),
      custom_css: null,
      expires_at: null
    };

    await expect(createInvitation(testInput))
      .rejects.toThrow(/template is not active/i);
  });

  it('should reject invalid JSON in wedding_data', async () => {
    const testInput: CreateInvitationInput = {
      user_id: userId,
      template_id: templateId,
      title: 'Invalid JSON Wedding',
      slug: 'invalid-json-wedding',
      wedding_data: 'invalid json string {',
      custom_css: null,
      expires_at: null
    };

    await expect(createInvitation(testInput))
      .rejects.toThrow(/invalid json format/i);
  });
});

describe('checkSlugAvailability', () => {
  let userId: number;
  let templateId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test template
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();
    templateId = templateResult[0].id;
  });

  afterEach(resetDB);

  it('should return true for available slug', async () => {
    const isAvailable = await checkSlugAvailability('available-slug');
    expect(isAvailable).toBe(true);
  });

  it('should return false for taken slug', async () => {
    // Create invitation with specific slug
    const testInput: CreateInvitationInput = {
      user_id: userId,
      template_id: templateId,
      title: 'Test Wedding',
      slug: 'taken-slug',
      wedding_data: JSON.stringify(weddingData),
      custom_css: null,
      expires_at: null
    };

    await createInvitation(testInput);

    const isAvailable = await checkSlugAvailability('taken-slug');
    expect(isAvailable).toBe(false);
  });

  it('should be case sensitive for slugs', async () => {
    // Create invitation with lowercase slug
    const testInput: CreateInvitationInput = {
      user_id: userId,
      template_id: templateId,
      title: 'Test Wedding',
      slug: 'case-sensitive-slug',
      wedding_data: JSON.stringify(weddingData),
      custom_css: null,
      expires_at: null
    };

    await createInvitation(testInput);

    const lowerCaseAvailable = await checkSlugAvailability('case-sensitive-slug');
    const upperCaseAvailable = await checkSlugAvailability('CASE-SENSITIVE-SLUG');
    
    expect(lowerCaseAvailable).toBe(false);
    expect(upperCaseAvailable).toBe(true); // Different case should be available
  });
});