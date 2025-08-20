import { db } from '../db';
import { 
  visitorsTable, 
  usersTable, 
  invitationsTable, 
  rsvpsTable 
} from '../db/schema';
import { type AnalyticsQuery } from '../schema';
import { sql, count, countDistinct, desc, gte, lte, and, eq, sum } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export async function getVisitorStats(query: AnalyticsQuery): Promise<{
    totalVisitors: number;
    uniqueVisitors: number;
    topInvitations: Array<{ invitationId: number; title: string; views: number; }>;
    dailyStats: Array<{ date: string; visitors: number; }>;
}> {
    try {
        // Build conditions for date filtering
        const conditions: SQL<unknown>[] = [];
        
        if (query.start_date) {
            conditions.push(gte(visitorsTable.visited_at, query.start_date));
        }
        
        if (query.end_date) {
            conditions.push(lte(visitorsTable.visited_at, query.end_date));
        }

        if (query.invitation_id) {
            conditions.push(eq(visitorsTable.invitation_id, query.invitation_id));
        }

        // Get total and unique visitor counts
        const visitorCountsQuery = conditions.length > 0
            ? db.select({
                totalVisitors: count().as('total_visitors'),
                uniqueVisitors: countDistinct(visitorsTable.ip_address).as('unique_visitors')
              }).from(visitorsTable).where(and(...conditions))
            : db.select({
                totalVisitors: count().as('total_visitors'),
                uniqueVisitors: countDistinct(visitorsTable.ip_address).as('unique_visitors')
              }).from(visitorsTable);

        const [visitorCounts] = await visitorCountsQuery.execute();

        // Get top invitations by visitor count
        const topInvitationsQuery = conditions.length > 0
            ? db.select({
                invitationId: visitorsTable.invitation_id,
                title: invitationsTable.title,
                views: count(visitorsTable.id).as('views')
              })
              .from(visitorsTable)
              .innerJoin(invitationsTable, eq(visitorsTable.invitation_id, invitationsTable.id))
              .where(and(...conditions))
              .groupBy(visitorsTable.invitation_id, invitationsTable.title)
              .orderBy(desc(count(visitorsTable.id)))
              .limit(10)
            : db.select({
                invitationId: visitorsTable.invitation_id,
                title: invitationsTable.title,
                views: count(visitorsTable.id).as('views')
              })
              .from(visitorsTable)
              .innerJoin(invitationsTable, eq(visitorsTable.invitation_id, invitationsTable.id))
              .groupBy(visitorsTable.invitation_id, invitationsTable.title)
              .orderBy(desc(count(visitorsTable.id)))
              .limit(10);

        const topInvitations = await topInvitationsQuery.execute();

        // Get daily visitor stats
        const dailyStatsQuery = conditions.length > 0
            ? db.select({
                date: sql<string>`DATE(${visitorsTable.visited_at})`.as('date'),
                visitors: count().as('visitors')
              })
              .from(visitorsTable)
              .where(and(...conditions))
              .groupBy(sql`DATE(${visitorsTable.visited_at})`)
              .orderBy(sql`DATE(${visitorsTable.visited_at})`)
            : db.select({
                date: sql<string>`DATE(${visitorsTable.visited_at})`.as('date'),
                visitors: count().as('visitors')
              })
              .from(visitorsTable)
              .groupBy(sql`DATE(${visitorsTable.visited_at})`)
              .orderBy(sql`DATE(${visitorsTable.visited_at})`);

        const dailyStats = await dailyStatsQuery.execute();

        return {
            totalVisitors: visitorCounts.totalVisitors,
            uniqueVisitors: visitorCounts.uniqueVisitors,
            topInvitations: topInvitations.map(inv => ({
                invitationId: inv.invitationId,
                title: inv.title,
                views: inv.views
            })),
            dailyStats: dailyStats.map(stat => ({
                date: stat.date,
                visitors: stat.visitors
            }))
        };
    } catch (error) {
        console.error('Visitor analytics query failed:', error);
        throw error;
    }
}

export async function getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    pendingApprovals: number;
    usersByRole: Array<{ role: string; count: number; }>;
}> {
    try {
        // Get total user count
        const [totalResult] = await db.select({
            totalUsers: count().as('total_users')
        }).from(usersTable).execute();

        // Get active user count
        const [activeResult] = await db.select({
            activeUsers: count().as('active_users')
        })
        .from(usersTable)
        .where(eq(usersTable.status, 'active'))
        .execute();

        // Get pending approvals count
        const [pendingResult] = await db.select({
            pendingApprovals: count().as('pending_approvals')
        })
        .from(usersTable)
        .where(eq(usersTable.status, 'pending'))
        .execute();

        // Get users by role
        const usersByRole = await db.select({
            role: usersTable.role,
            count: count().as('count')
        })
        .from(usersTable)
        .groupBy(usersTable.role)
        .execute();

        return {
            totalUsers: totalResult.totalUsers,
            activeUsers: activeResult.activeUsers,
            pendingApprovals: pendingResult.pendingApprovals,
            usersByRole: usersByRole.map(stat => ({
                role: stat.role,
                count: stat.count
            }))
        };
    } catch (error) {
        console.error('User statistics query failed:', error);
        throw error;
    }
}

export async function getInvitationStats(userId?: number): Promise<{
    totalInvitations: number;
    publishedInvitations: number;
    draftInvitations: number;
    totalViews: number;
    totalRsvps: number;
}> {
    try {
        // Get total invitations count
        const totalQuery = userId
            ? db.select({
                totalInvitations: count().as('total_invitations')
              }).from(invitationsTable).where(eq(invitationsTable.user_id, userId))
            : db.select({
                totalInvitations: count().as('total_invitations')
              }).from(invitationsTable);

        const [totalResult] = await totalQuery.execute();

        // Get published invitations count
        const publishedConditions: SQL<unknown>[] = [eq(invitationsTable.status, 'published')];
        if (userId) {
            publishedConditions.push(eq(invitationsTable.user_id, userId));
        }

        const [publishedResult] = await db.select({
            publishedInvitations: count().as('published_invitations')
        }).from(invitationsTable)
        .where(publishedConditions.length === 1 ? publishedConditions[0] : and(...publishedConditions))
        .execute();

        // Get draft invitations count
        const draftConditions: SQL<unknown>[] = [eq(invitationsTable.status, 'draft')];
        if (userId) {
            draftConditions.push(eq(invitationsTable.user_id, userId));
        }

        const [draftResult] = await db.select({
            draftInvitations: count().as('draft_invitations')
        }).from(invitationsTable)
        .where(draftConditions.length === 1 ? draftConditions[0] : and(...draftConditions))
        .execute();

        // Get total views
        const viewsQuery = userId
            ? db.select({
                totalViews: sum(invitationsTable.view_count).as('total_views')
              }).from(invitationsTable).where(eq(invitationsTable.user_id, userId))
            : db.select({
                totalViews: sum(invitationsTable.view_count).as('total_views')
              }).from(invitationsTable);

        const [viewsResult] = await viewsQuery.execute();

        // Get total RSVPs
        const rsvpsQuery = userId
            ? db.select({
                totalRsvps: count().as('total_rsvps')
              })
              .from(rsvpsTable)
              .innerJoin(invitationsTable, eq(rsvpsTable.invitation_id, invitationsTable.id))
              .where(eq(invitationsTable.user_id, userId))
            : db.select({
                totalRsvps: count().as('total_rsvps')
              })
              .from(rsvpsTable)
              .innerJoin(invitationsTable, eq(rsvpsTable.invitation_id, invitationsTable.id));

        const [rsvpsResult] = await rsvpsQuery.execute();

        // Convert totalViews from string to number (numeric columns are returned as strings)
        const totalViews = viewsResult.totalViews ? parseFloat(viewsResult.totalViews.toString()) : 0;

        return {
            totalInvitations: totalResult.totalInvitations,
            publishedInvitations: publishedResult.publishedInvitations,
            draftInvitations: draftResult.draftInvitations,
            totalViews: totalViews,
            totalRsvps: rsvpsResult.totalRsvps
        };
    } catch (error) {
        console.error('Invitation statistics query failed:', error);
        throw error;
    }
}