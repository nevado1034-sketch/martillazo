export class PaymentsController {
  constructor(service) {
    this.service = service;
  }

  processStandard = async (req, res, next) => {
    try {
      const { auctionId, amount, currency = 'PEN', sourceToken } = req.body;
      const idempotencyKey = req.get('Idempotency-Key');
      const transaction = await this.service.processStandardPayment({
        auctionId,
        buyerId: req.user.id,
        amount,
        currency,
        sourceToken,
        idempotencyKey,
      });
      return res.status(201).json({ data: transaction });
    } catch (err) {
      next(err);
    }
  };

  release = async (req, res, next) => {
    try {
      const { transactionId } = req.body;
      const result = await this.service.releaseEscrowPayment({ transactionId });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  dispute = async (req, res, next) => {
    try {
      const { transactionId, reason } = req.body;
      const result = await this.service.openDispute({ transactionId, reason });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  refund = async (req, res, next) => {
    try {
      const { transactionId, reason } = req.body;
      const result = await this.service.refundPayment({ transactionId, reason });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
