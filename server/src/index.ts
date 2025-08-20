import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  loginInputSchema,
  createTemplateInputSchema,
  createInvitationInputSchema,
  updateInvitationInputSchema,
  createRsvpInputSchema,
  createGuestbookInputSchema,
  createPaymentInputSchema,
  analyticsQuerySchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { authenticateUser } from './handlers/authenticate_user';
import { getUsers, getUsersPendingApproval } from './handlers/get_users';
import { updateUser, approveUser } from './handlers/update_user';
import { getTemplates, getTemplatesByCategory, getTemplateById } from './handlers/get_templates';
import { createTemplate } from './handlers/create_template';
import { createInvitation, checkSlugAvailability } from './handlers/create_invitation';
import { getInvitations, getInvitationBySlug, getInvitationById } from './handlers/get_invitations';
import { updateInvitation, publishInvitation, deleteInvitation } from './handlers/update_invitation';
import { createRsvp } from './handlers/create_rsvp';
import { getRsvpsByInvitation, getRsvpStats } from './handlers/get_rsvps';
import { createGuestbook } from './handlers/create_guestbook';
import { getGuestbookEntries, approveGuestbookEntry, deleteGuestbookEntry } from './handlers/get_guestbook';
import { createPayment, processPayment } from './handlers/create_payment';
import { getVisitorStats, getUserStats, getInvitationStats } from './handlers/get_analytics';
import { logVisitor } from './handlers/log_visitor';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  authenticateUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => authenticateUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  getUsersPendingApproval: publicProcedure
    .query(() => getUsersPendingApproval()),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  approveUser: publicProcedure
    .input(z.object({ userId: z.number(), approverId: z.number() }))
    .mutation(({ input }) => approveUser(input.userId, input.approverId)),

  // Template management routes
  getTemplates: publicProcedure
    .query(() => getTemplates()),

  getTemplatesByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(({ input }) => getTemplatesByCategory(input.category)),

  getTemplateById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTemplateById(input.id)),

  createTemplate: publicProcedure
    .input(createTemplateInputSchema)
    .mutation(({ input }) => createTemplate(input)),

  // Invitation management routes
  createInvitation: publicProcedure
    .input(createInvitationInputSchema)
    .mutation(({ input }) => createInvitation(input)),

  checkSlugAvailability: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => checkSlugAvailability(input.slug)),

  getInvitations: publicProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(({ input }) => getInvitations(input.userId)),

  getInvitationBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => getInvitationBySlug(input.slug)),

  getInvitationById: publicProcedure
    .input(z.object({ id: z.number(), userId: z.number().optional() }))
    .query(({ input }) => getInvitationById(input.id, input.userId)),

  updateInvitation: publicProcedure
    .input(updateInvitationInputSchema)
    .mutation(({ input }) => updateInvitation(input)),

  publishInvitation: publicProcedure
    .input(z.object({ invitationId: z.number() }))
    .mutation(({ input }) => publishInvitation(input.invitationId)),

  deleteInvitation: publicProcedure
    .input(z.object({ invitationId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteInvitation(input.invitationId, input.userId)),

  // RSVP routes
  createRsvp: publicProcedure
    .input(createRsvpInputSchema)
    .mutation(({ input }) => createRsvp(input)),

  getRsvpsByInvitation: publicProcedure
    .input(z.object({ invitationId: z.number() }))
    .query(({ input }) => getRsvpsByInvitation(input.invitationId)),

  getRsvpStats: publicProcedure
    .input(z.object({ invitationId: z.number() }))
    .query(({ input }) => getRsvpStats(input.invitationId)),

  // Guestbook routes
  createGuestbook: publicProcedure
    .input(createGuestbookInputSchema)
    .mutation(({ input }) => createGuestbook(input)),

  getGuestbookEntries: publicProcedure
    .input(z.object({ invitationId: z.number(), includeUnapproved: z.boolean().optional() }))
    .query(({ input }) => getGuestbookEntries(input.invitationId, input.includeUnapproved)),

  approveGuestbookEntry: publicProcedure
    .input(z.object({ entryId: z.number(), userId: z.number() }))
    .mutation(({ input }) => approveGuestbookEntry(input.entryId, input.userId)),

  deleteGuestbookEntry: publicProcedure
    .input(z.object({ entryId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteGuestbookEntry(input.entryId, input.userId)),

  // Payment routes
  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createPayment(input)),

  processPayment: publicProcedure
    .input(z.object({ paymentId: z.number(), gatewayResponse: z.any() }))
    .mutation(({ input }) => processPayment(input.paymentId, input.gatewayResponse)),

  // Analytics routes
  getVisitorStats: publicProcedure
    .input(analyticsQuerySchema)
    .query(({ input }) => getVisitorStats(input)),

  getUserStats: publicProcedure
    .query(() => getUserStats()),

  getInvitationStats: publicProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(({ input }) => getInvitationStats(input.userId)),

  // Visitor logging
  logVisitor: publicProcedure
    .input(z.object({ 
      invitationId: z.number(), 
      ipAddress: z.string(), 
      userAgent: z.string(), 
      referrer: z.string().optional() 
    }))
    .mutation(({ input }) => logVisitor(input.invitationId, input.ipAddress, input.userAgent, input.referrer)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();