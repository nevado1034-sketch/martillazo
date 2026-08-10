export class GuaranteesController {
  constructor(service) {
    this.service = service;
  }

  hold = async (req, res, next) => {
    try {
      const { auctionId, paymentMethodId, amount, currency } = req.body;
      const hold = await this.service.holdAuctionGuarantee({
        userId: req.user.id,
        auctionId,
        paymentMethodId,
        amount,
        currency,
      });
      return res.status(201).json({ data: hold });
    } catch (err) {
      next(err);
    }
  };

  release = async (req, res, next) => {
    try {
      const result = await this.service.releaseGuarantee({
        holdId: req.params.holdId,
        userId: req.user.id,
      });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  applyToDownPayment = async (req, res, next) => {
    try {
      const result = await this.service.applyToDownPayment({
        holdId: req.params.holdId,
        userId: req.user.id,
      });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  chargePenalty = async (req, res, next) => {
    try {
      const result = await this.service.chargePenalty({
        holdId: req.params.holdId,
        userId: req.user.id,
      });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
