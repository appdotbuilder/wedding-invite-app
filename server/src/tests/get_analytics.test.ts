import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  invitationsTable, 
  templatesTable, 
  visitorsTable, 
  rsvpsTable 
} from '../db/schema';
import { getVisitorStats, getUserStats, getInvitationStats } from '../handlers/get_analytics';
import { type AnalyticsQuery } from '../schema';

describe('Analytics Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getVisitorStats', () => {
    it('should return basic visitor statistics', async () => {
      // Create test template
      const [template] = await db.insert(templatesTable)
        .values({
          name: 'Test Template',
          category: 'romantic',
          thumbnail_url: 'https://example.com/thumb.jpg',
          preview_url: 'https://example.com/preview.jpg',
          template_data: '{"theme": "romantic"}'
        })
        .returning()
        .execute();

      // Create test user
      const [user] = await db.insert(usersTable)
        .values({
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          phone: null,
          password_hash: 'hashed_password',
          role: 'user_customer',
          status: 'active'
        })
        .returning()
        .execute();

      // Create test invitation
      const [invitation] = await db.insert(invitationsTable)
        .values({
          user_id: user.id,
          template_id: template.id,
          title: 'Test Wedding',
          slug: 'test-wedding',
          wedding_data: '{"bride": "Alice", "groom": "Bob"}',
          custom_css: null,
          expires_at: null
        })
        .returning()
        .execute();

      // Create test visitors
      await db.insert(visitorsTable)
        .values([
          {
            invitation_id: invitation.id,
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
            referrer: null
          },
          {
            invitation_id: invitation.id,
            ip_address: '192.168.1.2',
            user_agent: 'Chrome/91.0',
            referrer: 'https://google.com'
          },
          {
            invitation_id: invitation.id,
            ip_address: '192.168.1.1', // Same IP, should count as unique
            user_agent: 'Safari/14.0',
            referrer: null
          }
        ])
        .execute();

      const query: AnalyticsQuery = {};
      const result = await getVisitorStats(query);

      expect(result.totalVisitors).toEqual(3);
      expect(result.uniqueVisitors).toEqual(2); // Two unique IP addresses
      expect(result.topInvitations).toHaveLength(1);
      expect(result.topInvitations[0].invitationId).toEqual(invitation.id);
      expect(result.topInvitations[0].title).toEqual('Test Wedding');
      expect(result.topInvitations[0].views).toEqual(3);
      expect(result.dailyStats).toHaveLength(1);
      expect(result.dailyStats[0].visitors).toEqual(3);
      expect(typeof result.dailyStats[0].date).toBe('string');
    });

    it('should filter visitors by date range', async () => {
      // Create test template and user
      const [template] = await db.insert(templatesTable)
        .values({
          name: 'Test Template',
          category: 'romantic',
          thumbnail_url: 'https://example.com/thumb.jpg',
          preview_url: 'https://example.com/preview.jpg',
          template_data: '{"theme": "romantic"}'
        })
        .returning()
        .execute();

      const [user] = await db.insert(usersTable)
        .values({
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          phone: null,
          password_hash: 'hashed_password',
          role: 'user_customer',
          status: 'active'
        })
        .returning()
        .execute();

      const [invitation] = await db.insert(invitationsTable)
        .values({
          user_id: user.id,
          template_id: template.id,
          title: 'Test Wedding',
          slug: 'test-wedding',
          wedding_data: '{"bride": "Alice", "groom": "Bob"}',
          custom_css: null,
          expires_at: null
        })
        .returning()
        .execute();

      // Create visitor for today
      await db.insert(visitorsTable)
        .values({
          invitation_id: invitation.id,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          referrer: null
        })
        .execute();

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999); // End of day

      const query: AnalyticsQuery = {
        start_date: today,
        end_date: tomorrow
      };

      const result = await getVisitorStats(query);

      expect(result.totalVisitors).toEqual(1);
      expect(result.uniqueVisitors).toEqual(1);
    });

    it('should filter visitors by invitation ID', async () => {
      // Create test data for two invitations
      const [template] = await db.insert(templatesTable)
        .values({
          name: 'Test Template',
          category: 'romantic',
          thumbnail_url: 'https://example.com/thumb.jpg',
          preview_url: 'https://example.com/preview.jpg',
          template_data: '{"theme": "romantic"}'
        })
        .returning()
        .execute();

      const [user] = await db.insert(usersTable)
        .values({
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          phone: null,
          password_hash: 'hashed_password',
          role: 'user_customer',
          status: 'active'
        })
        .returning()
        .execute();

      const [invitation1] = await db.insert(invitationsTable)
        .values({
          user_id: user.id,
          template_id: template.id,
          title: 'First Wedding',
          slug: 'first-wedding',
          wedding_data: '{"bride": "Alice", "groom": "Bob"}',
          custom_css: null,
          expires_at: null
        })
        .returning()
        .execute();

      const [invitation2] = await db.insert(invitationsTable)
        .values({
          user_id: user.id,
          template_id: template.id,
          title: 'Second Wedding',
          slug: 'second-wedding',
          wedding_data: '{"bride": "Carol", "groom": "Dave"}',
          custom_css: null,
          expires_at: null
        })
        .returning()
        .execute();

      // Create visitors for both invitations
      await db.insert(visitorsTable)
        .values([
          {
            invitation_id: invitation1.id,
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
            referrer: null
          },
          {
            invitation_id: invitation2.id,
            ip_address: '192.168.1.2',
            user_agent: 'Chrome/91.0',
            referrer: null
          }
        ])
        .execute();

      const query: AnalyticsQuery = {
        invitation_id: invitation1.id
      };

      const result = await getVisitorStats(query);

      expect(result.totalVisitors).toEqual(1);
      expect(result.uniqueVisitors).toEqual(1);
      expect(result.topInvitations).toHaveLength(1);
      expect(result.topInvitations[0].invitationId).toEqual(invitation1.id);
      expect(result.topInvitations[0].title).toEqual('First Wedding');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      // Create test users with different roles and statuses
      await db.insert(usersTable)
        .values([
          {
            name: 'Super Admin',
            username: 'superadmin',
            email: 'admin@example.com',
            phone: null,
            password_hash: 'hashed_password',
            role: 'super_admin',
            status: 'active'
          },
          {
            name: 'Mitra User',
            username: 'mitra1',
            email: 'mitra@example.com',
            phone: null,
            password_hash: 'hashed_password',
            role: 'user_mitra',
            status: 'active'
          },
          {
            name: 'Customer User',
            username: 'customer1',
            email: 'customer@example.com',
            phone: null,
            password_hash: 'hashed_password',
            role: 'user_customer',
            status: 'pending'
          },
          {
            name: 'Suspended User',
            username: 'suspended1',
            email: 'suspended@example.com',
            phone: null,
            password_hash: 'hashed_password',
            role: 'user_customer',
            status: 'suspended'
          }
        ])
        .execute();

      const result = await getUserStats();

      expect(result.totalUsers).toEqual(4);
      expect(result.activeUsers).toEqual(2);
      expect(result.pendingApprovals).toEqual(1);
      expect(result.usersByRole).toHaveLength(3);
      
      // Check role distribution
      const adminCount = result.usersByRole.find(r => r.role === 'super_admin')?.count;
      const mitraCount = result.usersByRole.find(r => r.role === 'user_mitra')?.count;
      const customerCount = result.usersByRole.find(r => r.role === 'user_customer')?.count;

      expect(adminCount).toEqual(1);
      expect(mitraCount).toEqual(1);
      expect(customerCount).toEqual(2);
    });

    it('should handle empty user table', async () => {
      const result = await getUserStats();

      expect(result.totalUsers).toEqual(0);
      expect(result.activeUsers).toEqual(0);
      expect(result.pendingApprovals).toEqual(0);
      expect(result.usersByRole).toHaveLength(0);
    });
  });

  describe('getInvitationStats', () => {
    it('should return invitation statistics for all users', async () => {
      // Create test template
      const [template] = await db.insert(templatesTable)
        .values({
          name: 'Test Template',
          category: 'romantic',
          thumbnail_url: 'https://example.com/thumb.jpg',
          preview_url: 'https://example.com/preview.jpg',
          template_data: '{"theme": "romantic"}'
        })
        .returning()
        .execute();

      // Create test user
      const [user] = await db.insert(usersTable)
        .values({
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          phone: null,
          password_hash: 'hashed_password',
          role: 'user_customer',
          status: 'active'
        })
        .returning()
        .execute();

      // Create test invitations with different statuses
      const [invitation1] = await db.insert(invitationsTable)
        .values({
          user_id: user.id,
          template_id: template.id,
          title: 'Published Wedding',
          slug: 'published-wedding',
          status: 'published',
          wedding_data: '{"bride": "Alice", "groom": "Bob"}',
          custom_css: null,
          expires_at: null,
          view_count: 100
        })
        .returning()
        .execute();

      const [invitation2] = await db.insert(invitationsTable)
        .values({
          user_id: user.id,
          template_id: template.id,
          title: 'Draft Wedding',
          slug: 'draft-wedding',
          status: 'draft',
          wedding_data: '{"bride": "Carol", "groom": "Dave"}',
          custom_css: null,
          expires_at: null,
          view_count: 50
        })
        .returning()
        .execute();

      // Create RSVPs
      await db.insert(rsvpsTable)
        .values([
          {
            invitation_id: invitation1.id,
            guest_name: 'John Doe',
            guest_email: 'john@example.com',
            guest_phone: null,
            status: 'attending',
            guest_count: 2,
            message: 'Looking forward to it!'
          },
          {
            invitation_id: invitation2.id,
            guest_name: 'Jane Smith',
            guest_email: 'jane@example.com',
            guest_phone: null,
            status: 'not_attending',
            guest_count: 1,
            message: 'Sorry, cannot make it'
          }
        ])
        .execute();

      const result = await getInvitationStats();

      expect(result.totalInvitations).toEqual(2);
      expect(result.publishedInvitations).toEqual(1);
      expect(result.draftInvitations).toEqual(1);
      expect(result.totalViews).toEqual(150); // 100 + 50
      expect(result.totalRsvps).toEqual(2);
    });

    it('should return invitation statistics filtered by user ID', async () => {
      // Create test template
      const [template] = await db.insert(templatesTable)
        .values({
          name: 'Test Template',
          category: 'romantic',
          thumbnail_url: 'https://example.com/thumb.jpg',
          preview_url: 'https://example.com/preview.jpg',
          template_data: '{"theme": "romantic"}'
        })
        .returning()
        .execute();

      // Create two test users
      const [user1] = await db.insert(usersTable)
        .values({
          name: 'User One',
          username: 'user1',
          email: 'user1@example.com',
          phone: null,
          password_hash: 'hashed_password',
          role: 'user_customer',
          status: 'active'
        })
        .returning()
        .execute();

      const [user2] = await db.insert(usersTable)
        .values({
          name: 'User Two',
          username: 'user2',
          email: 'user2@example.com',
          phone: null,
          password_hash: 'hashed_password',
          role: 'user_customer',
          status: 'active'
        })
        .returning()
        .execute();

      // Create invitations for both users
      const [invitation1] = await db.insert(invitationsTable)
        .values({
          user_id: user1.id,
          template_id: template.id,
          title: 'User1 Wedding',
          slug: 'user1-wedding',
          status: 'published',
          wedding_data: '{"bride": "Alice", "groom": "Bob"}',
          custom_css: null,
          expires_at: null,
          view_count: 100
        })
        .returning()
        .execute();

      await db.insert(invitationsTable)
        .values({
          user_id: user2.id,
          template_id: template.id,
          title: 'User2 Wedding',
          slug: 'user2-wedding',
          status: 'draft',
          wedding_data: '{"bride": "Carol", "groom": "Dave"}',
          custom_css: null,
          expires_at: null,
          view_count: 200
        })
        .execute();

      // Create RSVP only for user1's invitation
      await db.insert(rsvpsTable)
        .values({
          invitation_id: invitation1.id,
          guest_name: 'John Doe',
          guest_email: 'john@example.com',
          guest_phone: null,
          status: 'attending',
          guest_count: 2,
          message: 'Looking forward to it!'
        })
        .execute();

      // Get stats for user1 only
      const result = await getInvitationStats(user1.id);

      expect(result.totalInvitations).toEqual(1);
      expect(result.publishedInvitations).toEqual(1);
      expect(result.draftInvitations).toEqual(0);
      expect(result.totalViews).toEqual(100);
      expect(result.totalRsvps).toEqual(1);
    });

    it('should handle user with no invitations', async () => {
      // Create test user without any invitations
      const [user] = await db.insert(usersTable)
        .values({
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          phone: null,
          password_hash: 'hashed_password',
          role: 'user_customer',
          status: 'active'
        })
        .returning()
        .execute();

      const result = await getInvitationStats(user.id);

      expect(result.totalInvitations).toEqual(0);
      expect(result.publishedInvitations).toEqual(0);
      expect(result.draftInvitations).toEqual(0);
      expect(result.totalViews).toEqual(0);
      expect(result.totalRsvps).toEqual(0);
    });
  });
});