import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'user_mitra', 'user_customer']);
export const userStatusEnum = pgEnum('user_status', ['pending', 'active', 'suspended', 'rejected']);
export const templateCategoryEnum = pgEnum('template_category', ['romantic', 'contemporary', 'formal', 'traditional']);
export const invitationStatusEnum = pgEnum('invitation_status', ['draft', 'published', 'unpublished', 'archived']);
export const rsvpStatusEnum = pgEnum('rsvp_status', ['attending', 'not_attending', 'maybe']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // Encrypted in database
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(), // Encrypted in database
  phone: text('phone'), // Encrypted in database, nullable
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  status: userStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  last_login: timestamp('last_login'),
  approved_by: integer('approved_by'), // Foreign key to users table
  approved_at: timestamp('approved_at')
});

// Login logs table
export const loginLogsTable = pgTable('login_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  login_time: timestamp('login_time').defaultNow().notNull(),
  ip_address: text('ip_address').notNull(), // Encrypted in database
  user_agent: text('user_agent').notNull(), // Encrypted in database
  success: boolean('success').notNull()
});

// Templates table
export const templatesTable = pgTable('templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: templateCategoryEnum('category').notNull(),
  thumbnail_url: text('thumbnail_url').notNull(),
  preview_url: text('preview_url').notNull(),
  template_data: text('template_data').notNull(), // JSON structure
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Invitations table
export const invitationsTable = pgTable('invitations', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  template_id: integer('template_id').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  status: invitationStatusEnum('status').notNull().default('draft'),
  wedding_data: text('wedding_data').notNull(), // JSON data
  custom_css: text('custom_css'),
  view_count: integer('view_count').notNull().default(0),
  rsvp_count: integer('rsvp_count').notNull().default(0),
  published_at: timestamp('published_at'),
  expires_at: timestamp('expires_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// RSVP responses table
export const rsvpsTable = pgTable('rsvps', {
  id: serial('id').primaryKey(),
  invitation_id: integer('invitation_id').notNull(),
  guest_name: text('guest_name').notNull(),
  guest_email: text('guest_email'),
  guest_phone: text('guest_phone'),
  status: rsvpStatusEnum('status').notNull(),
  guest_count: integer('guest_count').notNull(),
  message: text('message'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Guestbook entries table
export const guestbooksTable = pgTable('guestbooks', {
  id: serial('id').primaryKey(),
  invitation_id: integer('invitation_id').notNull(),
  guest_name: text('guest_name').notNull(),
  message: text('message').notNull(),
  is_approved: boolean('is_approved').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Payments table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  invitation_id: integer('invitation_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  payment_method: text('payment_method').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  transaction_id: text('transaction_id'),
  payment_data: text('payment_data'), // JSON for gateway response
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Visitor analytics table
export const visitorsTable = pgTable('visitors', {
  id: serial('id').primaryKey(),
  invitation_id: integer('invitation_id').notNull(),
  ip_address: text('ip_address').notNull(), // Encrypted
  user_agent: text('user_agent').notNull(), // Encrypted
  referrer: text('referrer'),
  visited_at: timestamp('visited_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  invitations: many(invitationsTable),
  payments: many(paymentsTable),
  loginLogs: many(loginLogsTable),
  approvedBy: one(usersTable, {
    fields: [usersTable.approved_by],
    references: [usersTable.id]
  })
}));

export const invitationsRelations = relations(invitationsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [invitationsTable.user_id],
    references: [usersTable.id]
  }),
  template: one(templatesTable, {
    fields: [invitationsTable.template_id],
    references: [templatesTable.id]
  }),
  rsvps: many(rsvpsTable),
  guestbooks: many(guestbooksTable),
  payments: many(paymentsTable),
  visitors: many(visitorsTable)
}));

export const templatesRelations = relations(templatesTable, ({ many }) => ({
  invitations: many(invitationsTable)
}));

export const rsvpsRelations = relations(rsvpsTable, ({ one }) => ({
  invitation: one(invitationsTable, {
    fields: [rsvpsTable.invitation_id],
    references: [invitationsTable.id]
  })
}));

export const guestbooksRelations = relations(guestbooksTable, ({ one }) => ({
  invitation: one(invitationsTable, {
    fields: [guestbooksTable.invitation_id],
    references: [invitationsTable.id]
  })
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [paymentsTable.user_id],
    references: [usersTable.id]
  }),
  invitation: one(invitationsTable, {
    fields: [paymentsTable.invitation_id],
    references: [invitationsTable.id]
  })
}));

export const visitorsRelations = relations(visitorsTable, ({ one }) => ({
  invitation: one(invitationsTable, {
    fields: [visitorsTable.invitation_id],
    references: [invitationsTable.id]
  })
}));

export const loginLogsRelations = relations(loginLogsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [loginLogsTable.user_id],
    references: [usersTable.id]
  })
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  loginLogs: loginLogsTable,
  templates: templatesTable,
  invitations: invitationsTable,
  rsvps: rsvpsTable,
  guestbooks: guestbooksTable,
  payments: paymentsTable,
  visitors: visitorsTable
};