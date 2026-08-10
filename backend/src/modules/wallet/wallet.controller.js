export class WalletController {
  constructor(service) {
    this.service = service;
  }

  getState = async (req, res, next) => {
    try {
      const data = await this.service.getState(req.user.id);
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  topup = async (req, res, next) => {
    try {
      const { amount, currency, method, referenceCode } = req.body ?? {};
      const data = await this.service.topup({
        userId: req.user.id,
        amount,
        currency,
        method,
        referenceCode,
      });
      return res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };
}
