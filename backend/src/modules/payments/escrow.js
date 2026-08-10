import { AppError } from '../../utils/errors.js';

/**
 * Cuenta de custodia (escrow) por subasta. Cada transacción abre una cuenta
 * puente `acc_<auctionId>` controlada por la API. Los débitos validan saldo
 * suficiente para nunca liberar de más.
 */

export async function creditEscrowAccount(client, { userId, provider, amountCents, auctionId }) {
  const { rows: [account] } = await client.query(
    `INSERT INTO escrow_accounts (user_id, provider, provider_account_id, balance, status)
     VALUES ($1, $2, $3, $4, 'FUNDED')
     ON CONFLICT (user_id, provider, provider_account_id)
     DO UPDATE SET balance = escrow_accounts.balance + EXCLUDED.balance,
                   status = 'HELD',
                   updated_at = now()
     RETURNING id, user_id, balance, status`,
    [userId, provider, `acc_${auctionId}`, amountCents],
  );
  return account;
}

export async function debitEscrowAccount(client, { userId, provider, amountCents, auctionId }) {
  const { rows: [account] } = await client.query(
    `UPDATE escrow_accounts
     SET balance = balance - $4, updated_at = now()
     WHERE user_id = $1 AND provider = $2 AND provider_account_id = $3
       AND balance >= $4
     RETURNING id, user_id, balance`,
    [userId, provider, `acc_${auctionId}`, amountCents],
  );
  if (!account) {
    throw new AppError({
      code: 'INSUFFICIENT_ESCROW',
      message: 'Saldo de custodia insuficiente para la operación',
      status: 409,
    });
  }
  return account;
}
