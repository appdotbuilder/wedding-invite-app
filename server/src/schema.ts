import { z } from 'zod';

// User management schemas
export const userRoleEnum = z.enum(['super_admin', 'user_mitra', 'user_customer']);
export type UserRole = z.infer<typeof userRoleEnum>;

export const userStatusEnum = z.enum(['pending', 'active', 'suspended', 'rejected']);
export type UserStatus = z.infer<typeof userStatusEnum>;

export const userSchema = z.object({
  id: z.number(),
  name: z.string(), // Encrypted in database
  username: z.string(),
  email: z.string(), // Encrypted in database
  phone: z.string().nullable(), // Encrypted in database
  password_hash: z.string(),
  role: userRoleEnum,
  status: userStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  last_login: z.coerce.date().nullable(),
  approved_by: z.number().nullable(), // Reference to admin who approved
  approved_at: z.coerce.date().nullable()
});

export type User = z.infer<typeof userSchema>;

// Login logs schema
export const loginLogSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  login_time: z.coerce.date(),
  ip_address: z.string(), // Encrypted in database
  user_agent: z.string(), // Encrypted in database
  success: z.boolean()
});

export type LoginLog = z.infer<typeof loginLogSchema>;

// Invitation template categories
export const templateCategoryEnum = z.enum(['romantic', 'contemporary', 'formal', 'traditional']);
export type TemplateCategory = z.infer<typeof templateCategoryEnum>;

// Template schema
export const templateSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: templateCategoryEnum,
  thumbnail_url: z.string(),
  preview_url: z.string(),
  template_data: z.string(), // JSON structure for template
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Template = z.infer<typeof templateSchema>;

// Invitation status
export const invitationStatusEnum = z.enum(['draft', 'published', 'unpublished', 'archived']);
export type InvitationStatus = z.infer<typeof invitationStatusEnum>;

// Invitation schema
export const invitationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  template_id: z.number(),
  title: z.string(),
  slug: z.string(), // Custom URL slug
  status: invitationStatusEnum,
  wedding_data: z.string(), // JSON data containing all wedding details
  custom_css: z.string().nullable(),
  view_count: z.number(),
  rsvp_count: z.number(),
  published_at: z.coerce.date().nullable(),
  expires_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Invitation = z.infer<typeof invitationSchema>;

// RSVP responses schema
export const rsvpStatusEnum = z.enum(['attending', 'not_attending', 'maybe']);
export type RsvpStatus = z.infer<typeof rsvpStatusEnum>;

export const rsvpSchema = z.object({
  id: z.number(),
  invitation_id: z.number(),
  guest_name: z.string(),
  guest_email: z.string().nullable(),
  guest_phone: z.string().nullable(),
  status: rsvpStatusEnum,
  guest_count: z.number().int(),
  message: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Rsvp = z.infer<typeof rsvpSchema>;

// Guestbook entries schema
export const guestbookSchema = z.object({
  id: z.number(),
  invitation_id: z.number(),
  guest_name: z.string(),
  message: z.string(),
  is_approved: z.boolean(),
  created_at: z.coerce.date()
});

export type Guestbook = z.infer<typeof guestbookSchema>;

// Payment records schema
export const paymentStatusEnum = z.enum(['pending', 'completed', 'failed', 'refunded']);
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

export const paymentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  invitation_id: z.number(),
  amount: z.number(),
  currency: z.string(),
  payment_method: z.string(),
  status: paymentStatusEnum,
  transaction_id: z.string().nullable(),
  payment_data: z.string().nullable(), // JSON for payment gateway response
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

// Visitor analytics schema
export const visitorSchema = z.object({
  id: z.number(),
  invitation_id: z.number(),
  ip_address: z.string(), // Encrypted
  user_agent: z.string(), // Encrypted
  referrer: z.string().nullable(),
  visited_at: z.coerce.date()
});

export type Visitor = z.infer<typeof visitorSchema>;

// Input schemas for creating/updating entities

// User registration input
export const createUserInputSchema = z.object({
  name: z.string(),
  username: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  password: z.string().min(8),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// User update input
export const updateUserInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  status: userStatusEnum.optional(),
  approved_by: z.number().nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Template creation input
export const createTemplateInputSchema = z.object({
  name: z.string(),
  category: templateCategoryEnum,
  thumbnail_url: z.string(),
  preview_url: z.string(),
  template_data: z.string()
});

export type CreateTemplateInput = z.infer<typeof createTemplateInputSchema>;

// Invitation creation input
export const createInvitationInputSchema = z.object({
  user_id: z.number(),
  template_id: z.number(),
  title: z.string(),
  slug: z.string(),
  wedding_data: z.string(),
  custom_css: z.string().nullable(),
  expires_at: z.coerce.date().nullable()
});

export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;

// Invitation update input
export const updateInvitationInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  slug: z.string().optional(),
  status: invitationStatusEnum.optional(),
  wedding_data: z.string().optional(),
  custom_css: z.string().nullable().optional(),
  expires_at: z.coerce.date().nullable().optional()
});

export type UpdateInvitationInput = z.infer<typeof updateInvitationInputSchema>;

// RSVP creation input
export const createRsvpInputSchema = z.object({
  invitation_id: z.number(),
  guest_name: z.string(),
  guest_email: z.string().email().nullable(),
  guest_phone: z.string().nullable(),
  status: rsvpStatusEnum,
  guest_count: z.number().int().positive(),
  message: z.string().nullable()
});

export type CreateRsvpInput = z.infer<typeof createRsvpInputSchema>;

// Guestbook entry input
export const createGuestbookInputSchema = z.object({
  invitation_id: z.number(),
  guest_name: z.string(),
  message: z.string()
});

export type CreateGuestbookInput = z.infer<typeof createGuestbookInputSchema>;

// Payment creation input
export const createPaymentInputSchema = z.object({
  user_id: z.number(),
  invitation_id: z.number(),
  amount: z.number().positive(),
  currency: z.string(),
  payment_method: z.string()
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Login input
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Analytics query input
export const analyticsQuerySchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  invitation_id: z.number().optional()
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;