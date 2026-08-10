export class BidsController {
  constructor(service) {
    this.service = service;
  }

  placeBid = async (req, res, next) => {
    try {
      const { auctionId, amount } = req.body;
      const result = await this.service.placeBid({
        auctionId,
        bidderId: req.user.id,
        amount,
      });
      return res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
