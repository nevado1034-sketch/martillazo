export class AuctionsController {
  constructor(service) {
    this.service = service;
  }

  listActive = async (req, res, next) => {
    try {
      const { flow, q, type, category, limit } = req.query;
      const auctions = await this.service.listActive({ flow, q, type, category, limit });
      return res.json({ data: auctions });
    } catch (err) {
      next(err);
    }
  };

  listCategories = async (_req, res, next) => {
    try {
      const categories = await this.service.listCategories();
      return res.json({ data: categories });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const { auctionId } = req.params;
      const result = await this.service.getById({ auctionId });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  create = async (req, res, next) => {
    try {
      const auction = await this.service.createAuction({
        sellerId: req.user.id,
        input: req.body,
      });
      return res.status(201).json({ data: auction });
    } catch (err) {
      next(err);
    }
  };

  listMine = async (req, res, next) => {
    try {
      const auctions = await this.service.listMine({ sellerId: req.user.id });
      return res.json({ data: auctions });
    } catch (err) {
      next(err);
    }
  };

  updateMine = async (req, res, next) => {
    try {
      const auction = await this.service.updateMine({
        auctionId: req.params.auctionId,
        sellerId: req.user.id,
        input: req.body,
      });
      return res.json({ data: auction });
    } catch (err) {
      next(err);
    }
  };

  deleteMine = async (req, res, next) => {
    try {
      const result = await this.service.deleteMine({
        auctionId: req.params.auctionId,
        sellerId: req.user.id,
      });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listMyBids = async (req, res, next) => {
    try {
      const bids = await this.service.listMyBids({ bidderId: req.user.id });
      return res.json({ data: bids });
    } catch (err) {
      next(err);
    }
  };

  getBidders = async (req, res, next) => {
    try {
      const { auctionId } = req.params;
      const result = await this.service.getAuctionBidders({
        auctionId,
        sellerId: req.user.id,
      });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
