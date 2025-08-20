import { db } from '../db';
import { paymentsTable, invitationsTable, usersTable } from '../db/schema';
import { type CreatePaymentInput, type Payment } from '../schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const createPayment = async (input: CreatePaymentInput): Promise<Payment> => {
  try {
    // 1. Validate user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // 2. Validate invitation exists
    const allInvitations = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, input.invitation_id))
      .execute();

    if (allInvitations.length === 0) {
      throw new Error('Invitation not found');
    }

    // 3. Validate invitation belongs to user
    const invitation = await db.select()
      .from(invitationsTable)
      .where(
        and(
          eq(invitationsTable.id, input.invitation_id),
          eq(invitationsTable.user_id, input.user_id)
        )
      )
      .execute();

    if (invitation.length === 0) {
      throw new Error('Invitation does not belong to the specified user');
    }

    // 3. Generate unique transaction_id
    const transaction_id = `TXN_${randomBytes(8).toString('hex').toUpperCase()}`;

    // 4. Create payment record with 'pending' status
    const result = await db.insert(paymentsTable)
      .values({
        user_id: input.user_id,
        invitation_id: input.invitation_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        currency: input.currency,
        payment_method: input.payment_method,
        status: 'pending',
        transaction_id: transaction_id,
        payment_data: null
      })
      .returning()
      .execute();

    // 5. Convert numeric fields back to numbers before returning
    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
};

export const processPayment = async (paymentId: number, gatewayResponse: any): Promise<Payment> => {
  try {
    // 1. Get the existing payment record
    const existingPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId))
      .execute();

    if (existingPayments.length === 0) {
      throw new Error('Payment not found');
    }

    const existingPayment = existingPayments[0];

    // 2. Determine status based on gateway response
    const status = gatewayResponse.success ? 'completed' : 'failed';
    
    // 3. Update payment status and store gateway response data
    const result = await db.update(paymentsTable)
      .set({
        status: status,
        payment_data: JSON.stringify(gatewayResponse),
        updated_at: new Date()
      })
      .where(eq(paymentsTable.id, paymentId))
      .returning()
      .execute();

    // 4. If successful, publish the associated invitation
    if (status === 'completed') {
      await db.update(invitationsTable)
        .set({
          status: 'published',
          published_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(invitationsTable.id, existingPayment.invitation_id))
        .execute();
    }

    // 5. Convert numeric fields back to numbers before returning
    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw error;
  }
};