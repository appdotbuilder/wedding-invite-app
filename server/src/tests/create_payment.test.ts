import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, usersTable, templatesTable, invitationsTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { createPayment, processPayment } from '../handlers/create_payment';
import { eq, and } from 'drizzle-orm';

// Test data setup
const testUser = {
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  phone: '+1234567890',
  password_hash: 'hashedpassword123',
  role: 'user_customer' as const,
  status: 'active' as const
};

const testTemplate = {
  name: 'Test Template',
  category: 'romantic' as const,
  thumbnail_url: 'https://example.com/thumb.jpg',
  preview_url: 'https://example.com/preview.jpg',
  template_data: '{"layout": "classic"}'
};

const testInvitation = {
  title: 'Test Wedding',
  slug: 'test-wedding-2024',
  status: 'draft' as const,
  wedding_data: '{"bride": "Alice", "groom": "Bob"}',
  custom_css: null,
  expires_at: null
};

const testPaymentInput: CreatePaymentInput = {
  user_id: 1, // Will be set after user creation
  invitation_id: 1, // Will be set after invitation creation
  amount: 99.99,
  currency: 'USD',
  payment_method: 'credit_card'
};

describe('createPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let templateId: number;
  let invitationId: number;

  beforeEach(async () => {
    // Create prerequisite data for each test
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();
    templateId = templateResult[0].id;

    const invitationResult = await db.insert(invitationsTable)
      .values({
        ...testInvitation,
        user_id: userId,
        template_id: templateId
      })
      .returning()
      .execute();
    invitationId = invitationResult[0].id;

    // Update test input with actual IDs
    testPaymentInput.user_id = userId;
    testPaymentInput.invitation_id = invitationId;
  });

  it('should create a payment successfully', async () => {
    const result = await createPayment(testPaymentInput);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.invitation_id).toEqual(invitationId);
    expect(result.amount).toEqual(99.99);
    expect(typeof result.amount).toBe('number');
    expect(result.currency).toEqual('USD');
    expect(result.payment_method).toEqual('credit_card');
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.transaction_id).toBeTruthy();
    expect(result.transaction_id).toMatch(/^TXN_[A-F0-9]{16}$/);
  });

  it('should save payment to database', async () => {
    const result = await createPayment(testPaymentInput);

    // Query database to verify record was saved
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, result.id))
      .execute();

    expect(payments).toHaveLength(1);
    const payment = payments[0];
    expect(payment.user_id).toEqual(userId);
    expect(payment.invitation_id).toEqual(invitationId);
    expect(parseFloat(payment.amount)).toEqual(99.99);
    expect(payment.currency).toEqual('USD');
    expect(payment.status).toEqual('pending');
    expect(payment.transaction_id).toMatch(/^TXN_[A-F0-9]{16}$/);
  });

  it('should generate unique transaction IDs', async () => {
    const payment1 = await createPayment(testPaymentInput);
    const payment2 = await createPayment(testPaymentInput);

    expect(payment1.transaction_id).not.toEqual(payment2.transaction_id);
    expect(payment1.transaction_id).toMatch(/^TXN_[A-F0-9]{16}$/);
    expect(payment2.transaction_id).toMatch(/^TXN_[A-F0-9]{16}$/);
  });

  it('should reject payment for non-existent user', async () => {
    const invalidInput = {
      ...testPaymentInput,
      user_id: 99999
    };

    await expect(createPayment(invalidInput)).rejects.toThrow(/user not found/i);
  });

  it('should reject payment for non-existent invitation', async () => {
    const invalidInput = {
      ...testPaymentInput,
      invitation_id: 99999
    };

    await expect(createPayment(invalidInput)).rejects.toThrow(/invitation not found/i);
  });

  it('should reject payment when invitation does not belong to user', async () => {
    // Create another user
    const otherUser = await db.insert(usersTable)
      .values({
        ...testUser,
        username: 'otheruser',
        email: 'other@example.com'
      })
      .returning()
      .execute();

    const invalidInput = {
      ...testPaymentInput,
      user_id: otherUser[0].id // Different user
    };

    await expect(createPayment(invalidInput)).rejects.toThrow(/invitation does not belong to the specified user/i);
  });
});

describe('processPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let templateId: number;
  let invitationId: number;
  let paymentId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();
    templateId = templateResult[0].id;

    const invitationResult = await db.insert(invitationsTable)
      .values({
        ...testInvitation,
        user_id: userId,
        template_id: templateId
      })
      .returning()
      .execute();
    invitationId = invitationResult[0].id;

    // Create a payment record
    const paymentResult = await createPayment({
      user_id: userId,
      invitation_id: invitationId,
      amount: 99.99,
      currency: 'USD',
      payment_method: 'credit_card'
    });
    paymentId = paymentResult.id;
  });

  it('should process successful payment', async () => {
    const gatewayResponse = {
      success: true,
      gateway_transaction_id: 'GTW_123456789',
      amount: 99.99,
      timestamp: new Date().toISOString()
    };

    const result = await processPayment(paymentId, gatewayResponse);

    // Verify payment status updated
    expect(result.status).toEqual('completed');
    expect(result.payment_data).toEqual(JSON.stringify(gatewayResponse));
    expect(result.amount).toEqual(99.99);
    expect(typeof result.amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should process failed payment', async () => {
    const gatewayResponse = {
      success: false,
      error_code: 'CARD_DECLINED',
      error_message: 'Insufficient funds',
      timestamp: new Date().toISOString()
    };

    const result = await processPayment(paymentId, gatewayResponse);

    // Verify payment status updated
    expect(result.status).toEqual('failed');
    expect(result.payment_data).toEqual(JSON.stringify(gatewayResponse));
    expect(result.amount).toEqual(99.99);
  });

  it('should publish invitation on successful payment', async () => {
    const gatewayResponse = {
      success: true,
      gateway_transaction_id: 'GTW_123456789',
      amount: 99.99
    };

    await processPayment(paymentId, gatewayResponse);

    // Verify invitation was published
    const invitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .execute();

    expect(invitations).toHaveLength(1);
    const invitation = invitations[0];
    expect(invitation.status).toEqual('published');
    expect(invitation.published_at).toBeInstanceOf(Date);
    expect(invitation.updated_at).toBeInstanceOf(Date);
  });

  it('should not publish invitation on failed payment', async () => {
    const gatewayResponse = {
      success: false,
      error_code: 'CARD_DECLINED'
    };

    await processPayment(paymentId, gatewayResponse);

    // Verify invitation remains in draft status
    const invitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .execute();

    expect(invitations).toHaveLength(1);
    const invitation = invitations[0];
    expect(invitation.status).toEqual('draft');
    expect(invitation.published_at).toBeNull();
  });

  it('should update payment record in database', async () => {
    const gatewayResponse = {
      success: true,
      gateway_transaction_id: 'GTW_987654321'
    };

    await processPayment(paymentId, gatewayResponse);

    // Verify database record was updated
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId))
      .execute();

    expect(payments).toHaveLength(1);
    const payment = payments[0];
    expect(payment.status).toEqual('completed');
    expect(payment.payment_data).toEqual(JSON.stringify(gatewayResponse));
    expect(payment.updated_at).toBeInstanceOf(Date);
  });

  it('should reject processing for non-existent payment', async () => {
    const gatewayResponse = { success: true };

    await expect(processPayment(99999, gatewayResponse)).rejects.toThrow(/payment not found/i);
  });
});