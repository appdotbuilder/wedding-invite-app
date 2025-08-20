import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { visitorsTable, invitationsTable, usersTable, templatesTable } from '../db/schema';
import { logVisitor } from '../handlers/log_visitor';
import { eq } from 'drizzle-orm';

const testUser = {
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  phone: null,
  password_hash: 'hashed_password',
  role: 'user_mitra' as const
};

const testTemplate = {
  name: 'Test Template',
  category: 'romantic' as const,
  thumbnail_url: 'https://example.com/thumb.jpg',
  preview_url: 'https://example.com/preview.jpg',
  template_data: '{"layout": "standard"}'
};

const testInvitation = {
  title: 'Test Wedding',
  slug: 'test-wedding-123',
  wedding_data: '{"bride": "Alice", "groom": "Bob"}',
  custom_css: null,
  expires_at: null
};

describe('logVisitor', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should log visitor data and increment view count', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();

    const invitationResult = await db.insert(invitationsTable)
      .values({
        ...testInvitation,
        user_id: userResult[0].id,
        template_id: templateResult[0].id
      })
      .returning()
      .execute();

    const invitation = invitationResult[0];
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const referrer = 'https://google.com';

    // Log visitor
    const result = await logVisitor(invitation.id, ipAddress, userAgent, referrer);

    // Verify returned visitor data
    expect(result.id).toBeDefined();
    expect(result.invitation_id).toEqual(invitation.id);
    expect(result.ip_address).toEqual(ipAddress); // Should return original for logging
    expect(result.user_agent).toEqual(userAgent); // Should return original for logging
    expect(result.referrer).toEqual(referrer);
    expect(result.visited_at).toBeInstanceOf(Date);
  });

  it('should store encrypted visitor data in database', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();

    const invitationResult = await db.insert(invitationsTable)
      .values({
        ...testInvitation,
        user_id: userResult[0].id,
        template_id: templateResult[0].id
      })
      .returning()
      .execute();

    const invitation = invitationResult[0];
    const ipAddress = '10.0.0.1';
    const userAgent = 'Safari/537.36';

    await logVisitor(invitation.id, ipAddress, userAgent);

    // Verify encrypted data is stored in database
    const storedVisitors = await db.select()
      .from(visitorsTable)
      .where(eq(visitorsTable.invitation_id, invitation.id))
      .execute();

    expect(storedVisitors).toHaveLength(1);
    const storedVisitor = storedVisitors[0];
    
    // Verify data is encrypted (not equal to original)
    expect(storedVisitor.ip_address).not.toEqual(ipAddress);
    expect(storedVisitor.user_agent).not.toEqual(userAgent);
    
    // Verify encrypted data can be decoded (basic check)
    expect(Buffer.from(storedVisitor.ip_address, 'base64').toString()).toEqual(ipAddress);
    expect(Buffer.from(storedVisitor.user_agent, 'base64').toString()).toEqual(userAgent);
  });

  it('should increment invitation view count atomically', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();

    const invitationResult = await db.insert(invitationsTable)
      .values({
        ...testInvitation,
        user_id: userResult[0].id,
        template_id: templateResult[0].id
      })
      .returning()
      .execute();

    const invitation = invitationResult[0];
    const initialViewCount = invitation.view_count;

    // Log multiple visitors
    await logVisitor(invitation.id, '192.168.1.1', 'Browser1');
    await logVisitor(invitation.id, '192.168.1.2', 'Browser2');
    await logVisitor(invitation.id, '192.168.1.3', 'Browser3');

    // Verify view count was incremented correctly
    const updatedInvitation = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitation.id))
      .execute();

    expect(updatedInvitation[0].view_count).toEqual(initialViewCount + 3);
  });

  it('should handle visitor logging without referrer', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();

    const invitationResult = await db.insert(invitationsTable)
      .values({
        ...testInvitation,
        user_id: userResult[0].id,
        template_id: templateResult[0].id
      })
      .returning()
      .execute();

    const invitation = invitationResult[0];

    // Log visitor without referrer
    const result = await logVisitor(invitation.id, '127.0.0.1', 'TestAgent');

    expect(result.referrer).toBeNull();
    
    // Verify in database
    const storedVisitors = await db.select()
      .from(visitorsTable)
      .where(eq(visitorsTable.invitation_id, invitation.id))
      .execute();

    expect(storedVisitors[0].referrer).toBeNull();
  });

  it('should handle concurrent visitor logging correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();

    const invitationResult = await db.insert(invitationsTable)
      .values({
        ...testInvitation,
        user_id: userResult[0].id,
        template_id: templateResult[0].id
      })
      .returning()
      .execute();

    const invitation = invitationResult[0];
    const initialViewCount = invitation.view_count;

    // Simulate concurrent visitor logging
    const promises = Array.from({ length: 5 }, (_, i) => 
      logVisitor(invitation.id, `192.168.1.${i + 1}`, `Browser${i + 1}`)
    );

    const results = await Promise.all(promises);

    // Verify all visitors were logged successfully
    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result.id).toBeDefined();
      expect(result.invitation_id).toEqual(invitation.id);
    });

    // Verify view count was incremented correctly despite concurrency
    const updatedInvitation = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitation.id))
      .execute();

    expect(updatedInvitation[0].view_count).toEqual(initialViewCount + 5);

    // Verify all visitor records were created
    const allVisitors = await db.select()
      .from(visitorsTable)
      .where(eq(visitorsTable.invitation_id, invitation.id))
      .execute();

    expect(allVisitors).toHaveLength(5);
  });

  it('should throw error for non-existent invitation', async () => {
    const nonExistentInvitationId = 99999;

    // Should throw error when invitation doesn't exist
    await expect(
      logVisitor(nonExistentInvitationId, '192.168.1.1', 'TestBrowser')
    ).rejects.toThrow();
  });
});