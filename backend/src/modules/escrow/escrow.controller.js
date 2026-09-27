export class EscrowController {
  constructor(service) {
    this.service = service;
  }

  config = async (_req, res, next) => {
    try {
      return res.json({ data: this.service.commissionConfig() });
    } catch (err) {
      next(err);
    }
  };

  listMine = async (req, res, next) => {
    try {
      const role = req.query.role || 'all';
      const data = await this.service.listForUser(req.user.id, role);
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  get = async (req, res, next) => {
    try {
      const data = await this.service.getOrder(req.params.id, {
        userId: req.user.id,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  createFromOffer = async (req, res, next) => {
    try {
      const data = await this.service.createFromOffer({
        offerId: req.body?.offerId || req.params.offerId,
        actorId: req.user.id,
      });
      return res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  buyNow = async (req, res, next) => {
    try {
      const data = await this.service.createBuyNow({
        listingId: req.body?.listingId || req.params.listingId,
        buyerId: req.user.id,
      });
      return res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  paySandbox = async (req, res, next) => {
    try {
      // Rechazar cualquier intento de enviar PAN/CVV
      if (req.body?.cvv != null || req.body?.pan != null || req.body?.cardNumber) {
        return res.status(422).json({
          error: {
            code: 'CARD_SENSITIVE_REJECTED',
            message:
              'No enviamos ni guardamos el número completo ni el CVV. Usa pago sandbox o pasarela tokenizada.',
          },
        });
      }
      const data = await this.service.paySandbox({
        orderId: req.params.id,
        buyerId: req.user.id,
        idempotencyKey: req.headers['idempotency-key'],
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  webhook = async (req, res, next) => {
    try {
      const data = await this.service.handleProviderWebhook({
        type: req.body?.type,
        data: req.body?.data,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  markShipped = async (req, res, next) => {
    try {
      const data = await this.service.markShipped({
        orderId: req.params.id,
        sellerId: req.user.id,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  markDelivered = async (req, res, next) => {
    try {
      const data = await this.service.markDelivered({
        orderId: req.params.id,
        userId: req.user.id,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  confirm = async (req, res, next) => {
    try {
      const data = await this.service.buyerConfirm({
        orderId: req.params.id,
        buyerId: req.user.id,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  dispute = async (req, res, next) => {
    try {
      const data = await this.service.buyerDispute({
        orderId: req.params.id,
        buyerId: req.user.id,
        reason: req.body?.reason,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  mediate = async (req, res, next) => {
    try {
      const data = await this.service.mediate({
        orderId: req.params.id,
        action: req.body?.action,
        note: req.body?.note,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  runAutoRelease = async (_req, res, next) => {
    try {
      const data = await this.service.processAutoReleases();
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}
