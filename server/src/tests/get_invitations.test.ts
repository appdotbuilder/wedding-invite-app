import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, templatesTable, invitationsTable } from '../db/schema';
import { getInvitations, getInvitationBySlug, getInvitationById } from '../handlers/get_invitations';
import { eq } from 'drizzle-orm';
import { type CreateUserInput, type CreateTemplateInput, type CreateInvitationInput } from '../schema';

// Test data
const testSuperAdmin: CreateUserInput = {
  name: 'Super Admin',
  username: 'superadmin',
  email: 'admin@test.com',
  phone: '+1234567890',
  password: 'password123',
  role: 'super_admin'
};

const testMitra: CreateUserInput = {
  name: 'Mitra User',
  username: 'mitra',
  email: 'mitra@test.com',
  phone: '+1234567891',
  password: 'password123',
  role: 'user_mitra'
};

const testCustomer: CreateUserInput = {
  name: 'Customer User',
  username: 'customer',
  email: 'customer@test.com',
  phone: '+1234567892',
  password: 'password123',
  role: 'user_customer'
};

const testTemplate: CreateTemplateInput = {
  name: 'Test Template',
  category: 'romantic',
  thumbnail_url: 'https://example.com/thumb.jpg',
  preview_url: 'https://example.com/preview.jpg',
  template_data: '{"layout": "basic"}'
};

describe('getInvitations', () => {
  let superAdminId: number;
  let mitraId: number;
  let customerId: number;
  let templateId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const superAdminResult = await db.insert(usersTable)
      .values({
        name: testSuperAdmin.name,
        username: testSuperAdmin.username,
        email: testSuperAdmin.email,
        phone: testSuperAdmin.phone,
        password_hash: 'hashed_password',
        role: testSuperAdmin.role,
        status: 'active'
      })
      .returning()
      .execute();
    superAdminId = superAdminResult[0].id;

    const mitraResult = await db.insert(usersTable)
      .values({
        name: testMitra.name,
        username: testMitra.username,
        email: testMitra.email,
        phone: testMitra.phone,
        password_hash: 'hashed_password',
        role: testMitra.role,
        status: 'active'
      })
      .returning()
      .execute();
    mitraId = mitraResult[0].id;

    const customerResult = await db.insert(usersTable)
      .values({
        name: testCustomer.name,
        username: testCustomer.username,
        email: testCustomer.email,
        phone: testCustomer.phone,
        password_hash: 'hashed_password',
        role: testCustomer.role,
        status: 'active'
      })
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create test template
    const templateResult = await db.insert(templatesTable)
      .values({
        name: testTemplate.name,
        category: testTemplate.category,
        thumbnail_url: testTemplate.thumbnail_url,
        preview_url: testTemplate.preview_url,
        template_data: testTemplate.template_data
      })
      .returning()
      .execute();
    templateId = templateResult[0].id;
  });

  afterEach(resetDB);

  it('should return all invitations for super admin', async () => {
    // Create invitations for different users
    await db.insert(invitationsTable).values([
      {
        user_id: mitraId,
        template_id: templateId,
        title: 'Mitra Invitation',
        slug: 'mitra-invitation',
        status: 'published',
        wedding_data: '{"bride": "Alice", "groom": "Bob"}'
      },
      {
        user_id: customerId,
        template_id: templateId,
        title: 'Customer Invitation',
        slug: 'customer-invitation',
        status: 'draft',
        wedding_data: '{"bride": "Carol", "groom": "Dave"}'
      }
    ]).execute();

    const result = await getInvitations(superAdminId);

    expect(result).toHaveLength(2);
    expect(result.map(i => i.title)).toContain('Mitra Invitation');
    expect(result.map(i => i.title)).toContain('Customer Invitation');
  });

  it('should return only user invitations for mitra', async () => {
    // Create invitations
    await db.insert(invitationsTable).values([
      {
        user_id: mitraId,
        template_id: templateId,
        title: 'Mitra Invitation',
        slug: 'mitra-invitation',
        status: 'published',
        wedding_data: '{"bride": "Alice", "groom": "Bob"}'
      },
      {
        user_id: customerId,
        template_id: templateId,
        title: 'Customer Invitation',
        slug: 'customer-invitation',
        status: 'published',
        wedding_data: '{"bride": "Carol", "groom": "Dave"}'
      }
    ]).execute();

    const result = await getInvitations(mitraId);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Mitra Invitation');
    expect(result[0].user_id).toEqual(mitraId);
  });

  it('should return only user invitations for customer', async () => {
    // Create invitations
    await db.insert(invitationsTable).values([
      {
        user_id: mitraId,
        template_id: templateId,
        title: 'Mitra Invitation',
        slug: 'mitra-invitation',
        status: 'published',
        wedding_data: '{"bride": "Alice", "groom": "Bob"}'
      },
      {
        user_id: customerId,
        template_id: templateId,
        title: 'Customer Invitation',
        slug: 'customer-invitation',
        status: 'published',
        wedding_data: '{"bride": "Carol", "groom": "Dave"}'
      }
    ]).execute();

    const result = await getInvitations(customerId);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Customer Invitation');
    expect(result[0].user_id).toEqual(customerId);
  });

  it('should return only published invitations for public access', async () => {
    // Create invitations with different statuses
    await db.insert(invitationsTable).values([
      {
        user_id: mitraId,
        template_id: templateId,
        title: 'Published Invitation',
        slug: 'published-invitation',
        status: 'published',
        wedding_data: '{"bride": "Alice", "groom": "Bob"}'
      },
      {
        user_id: customerId,
        template_id: templateId,
        title: 'Draft Invitation',
        slug: 'draft-invitation',
        status: 'draft',
        wedding_data: '{"bride": "Carol", "groom": "Dave"}'
      }
    ]).execute();

    const result = await getInvitations(); // No userId provided

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Published Invitation');
    expect(result[0].status).toEqual('published');
  });

  it('should throw error for non-existent user', async () => {
    await expect(getInvitations(999)).rejects.toThrow(/user not found/i);
  });
});

describe('getInvitationBySlug', () => {
  let userId: number;
  let templateId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: testCustomer.name,
        username: testCustomer.username,
        email: testCustomer.email,
        phone: testCustomer.phone,
        password_hash: 'hashed_password',
        role: testCustomer.role,
        status: 'active'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test template
    const templateResult = await db.insert(templatesTable)
      .values({
        name: testTemplate.name,
        category: testTemplate.category,
        thumbnail_url: testTemplate.thumbnail_url,
        preview_url: testTemplate.preview_url,
        template_data: testTemplate.template_data
      })
      .returning()
      .execute();
    templateId = templateResult[0].id;
  });

  afterEach(resetDB);

  it('should return published invitation by slug and increment view count', async () => {
    // Create published invitation
    await db.insert(invitationsTable).values({
      user_id: userId,
      template_id: templateId,
      title: 'Test Invitation',
      slug: 'test-invitation',
      status: 'published',
      wedding_data: '{"bride": "Alice", "groom": "Bob"}',
      view_count: 5
    }).execute();

    const result = await getInvitationBySlug('test-invitation');

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Test Invitation');
    expect(result!.slug).toEqual('test-invitation');
    expect(result!.view_count).toEqual(6); // Incremented from 5 to 6

    // Verify view count was updated in database
    const dbResult = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.slug, 'test-invitation'))
      .execute();
    
    expect(dbResult[0].view_count).toEqual(6);
  });

  it('should return null for draft invitation by slug', async () => {
    // Create draft invitation
    await db.insert(invitationsTable).values({
      user_id: userId,
      template_id: templateId,
      title: 'Draft Invitation',
      slug: 'draft-invitation',
      status: 'draft',
      wedding_data: '{"bride": "Carol", "groom": "Dave"}'
    }).execute();

    const result = await getInvitationBySlug('draft-invitation');

    expect(result).toBeNull();
  });

  it('should return null for non-existent slug', async () => {
    const result = await getInvitationBySlug('non-existent-slug');

    expect(result).toBeNull();
  });
});

describe('getInvitationById', () => {
  let superAdminId: number;
  let mitraId: number;
  let customerId: number;
  let templateId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const superAdminResult = await db.insert(usersTable)
      .values({
        name: testSuperAdmin.name,
        username: testSuperAdmin.username,
        email: testSuperAdmin.email,
        phone: testSuperAdmin.phone,
        password_hash: 'hashed_password',
        role: testSuperAdmin.role,
        status: 'active'
      })
      .returning()
      .execute();
    superAdminId = superAdminResult[0].id;

    const mitraResult = await db.insert(usersTable)
      .values({
        name: testMitra.name,
        username: testMitra.username,
        email: testMitra.email,
        phone: testMitra.phone,
        password_hash: 'hashed_password',
        role: testMitra.role,
        status: 'active'
      })
      .returning()
      .execute();
    mitraId = mitraResult[0].id;

    const customerResult = await db.insert(usersTable)
      .values({
        name: testCustomer.name,
        username: testCustomer.username,
        email: testCustomer.email,
        phone: testCustomer.phone,
        password_hash: 'hashed_password',
        role: testCustomer.role,
        status: 'active'
      })
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create test template
    const templateResult = await db.insert(templatesTable)
      .values({
        name: testTemplate.name,
        category: testTemplate.category,
        thumbnail_url: testTemplate.thumbnail_url,
        preview_url: testTemplate.preview_url,
        template_data: testTemplate.template_data
      })
      .returning()
      .execute();
    templateId = templateResult[0].id;
  });

  afterEach(resetDB);

  it('should return invitation for super admin regardless of ownership', async () => {
    // Create invitation owned by customer
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: customerId,
        template_id: templateId,
        title: 'Customer Invitation',
        slug: 'customer-invitation',
        status: 'draft',
        wedding_data: '{"bride": "Alice", "groom": "Bob"}'
      })
      .returning()
      .execute();

    const result = await getInvitationById(invitationResult[0].id, superAdminId);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Customer Invitation');
    expect(result!.user_id).toEqual(customerId);
  });

  it('should return invitation for owner (mitra)', async () => {
    // Create invitation owned by mitra
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: mitraId,
        template_id: templateId,
        title: 'Mitra Invitation',
        slug: 'mitra-invitation',
        status: 'published',
        wedding_data: '{"bride": "Carol", "groom": "Dave"}'
      })
      .returning()
      .execute();

    const result = await getInvitationById(invitationResult[0].id, mitraId);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Mitra Invitation');
    expect(result!.user_id).toEqual(mitraId);
  });

  it('should return invitation for owner (customer)', async () => {
    // Create invitation owned by customer
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: customerId,
        template_id: templateId,
        title: 'Customer Invitation',
        slug: 'customer-invitation',
        status: 'draft',
        wedding_data: '{"bride": "Eve", "groom": "Frank"}'
      })
      .returning()
      .execute();

    const result = await getInvitationById(invitationResult[0].id, customerId);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Customer Invitation');
    expect(result!.user_id).toEqual(customerId);
  });

  it('should return null for non-owner (customer accessing mitra invitation)', async () => {
    // Create invitation owned by mitra
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: mitraId,
        template_id: templateId,
        title: 'Mitra Invitation',
        slug: 'mitra-invitation',
        status: 'published',
        wedding_data: '{"bride": "Grace", "groom": "Henry"}'
      })
      .returning()
      .execute();

    const result = await getInvitationById(invitationResult[0].id, customerId);

    expect(result).toBeNull();
  });

  it('should return null for non-owner (mitra accessing customer invitation)', async () => {
    // Create invitation owned by customer
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: customerId,
        template_id: templateId,
        title: 'Customer Invitation',
        slug: 'customer-invitation',
        status: 'draft',
        wedding_data: '{"bride": "Ivy", "groom": "Jack"}'
      })
      .returning()
      .execute();

    const result = await getInvitationById(invitationResult[0].id, mitraId);

    expect(result).toBeNull();
  });

  it('should return published invitation for public access (no userId)', async () => {
    // Create published invitation
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: customerId,
        template_id: templateId,
        title: 'Public Invitation',
        slug: 'public-invitation',
        status: 'published',
        wedding_data: '{"bride": "Kate", "groom": "Liam"}'
      })
      .returning()
      .execute();

    const result = await getInvitationById(invitationResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Public Invitation');
    expect(result!.status).toEqual('published');
  });

  it('should return null for draft invitation with public access (no userId)', async () => {
    // Create draft invitation
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: customerId,
        template_id: templateId,
        title: 'Draft Invitation',
        slug: 'draft-invitation',
        status: 'draft',
        wedding_data: '{"bride": "Mia", "groom": "Noah"}'
      })
      .returning()
      .execute();

    const result = await getInvitationById(invitationResult[0].id);

    expect(result).toBeNull();
  });

  it('should return null for non-existent invitation', async () => {
    const result = await getInvitationById(999, customerId);

    expect(result).toBeNull();
  });

  it('should throw error for non-existent user', async () => {
    // Create invitation
    const invitationResult = await db.insert(invitationsTable)
      .values({
        user_id: customerId,
        template_id: templateId,
        title: 'Test Invitation',
        slug: 'test-invitation',
        status: 'published',
        wedding_data: '{"bride": "Olivia", "groom": "Paul"}'
      })
      .returning()
      .execute();

    await expect(getInvitationById(invitationResult[0].id, 999)).rejects.toThrow(/user not found/i);
  });
});