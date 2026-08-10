export class SettlementsController {
  constructor(service) {
    this.service = service;
  }

  getState = async (req, res, next) => {
    try {
      const { auctionId } = req.params;
      const state = await this.service.getState({ auctionId });
      return res.json({ data: state });
    } catch (err) {
      next(err);
    }
  };

  confirmDelivery = async (req, res, next) => {
    try {
      const { auctionId } = req.params;
      const delivery = await this.service.confirmDelivery({
        auctionId,
        userId: req.user.id,
      });
      return res.json({ data: delivery });
    } catch (err) {
      next(err);
    }
  };

  settle = async (req, res, next) => {
    try {
      const { auctionId } = req.params;
      const result = await this.service.settle({
        auctionId,
        userId: req.user.id,
      });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
