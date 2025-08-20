import { db } from '../db';
import { invitationsTable, usersTable, templatesTable } from '../db/schema';
import { type CreateInvitationInput, type Invitation } from '../schema';
import { eq } from 'drizzle-orm';

export async function createInvitation(input: CreateInvitationInput): Promise<Invitation> {
  try {
    // 1. Validate that the slug is unique
    const existingSlug = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.slug, input.slug))
      .execute();

    if (existingSlug.length > 0) {
      throw new Error(`Slug '${input.slug}' is already taken`);
    }

    // 2. Validate that the user exists and has appropriate role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].status !== 'active') {
      throw new Error('User must be active to create invitations');
    }

    // 3. Validate that the template exists and is active
    const template = await db.select()
      .from(templatesTable)
      .where(eq(templatesTable.id, input.template_id))
      .execute();

    if (template.length === 0) {
      throw new Error('Template not found');
    }

    if (!template[0].is_active) {
      throw new Error('Template is not active');
    }

    // 4. Validate wedding_data is valid JSON
    try {
      JSON.parse(input.wedding_data);
    } catch (error) {
      throw new Error('Invalid JSON format in wedding_data');
    }

    // 5. Insert invitation record with 'draft' status
    const result = await db.insert(invitationsTable)
      .values({
        user_id: input.user_id,
        template_id: input.template_id,
        title: input.title,
        slug: input.slug,
        status: 'draft',
        wedding_data: input.wedding_data,
        custom_css: input.custom_css,
        view_count: 0,
        rsvp_count: 0,
        expires_at: input.expires_at
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Invitation creation failed:', error);
    throw error;
  }
}

export async function checkSlugAvailability(slug: string): Promise<boolean> {
  try {
    const existingSlug = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.slug, slug))
      .execute();

    return existingSlug.length === 0;
  } catch (error) {
    console.error('Slug availability check failed:', error);
    throw error;
  }
}