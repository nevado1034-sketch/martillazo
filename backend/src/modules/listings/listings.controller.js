export class ListingsController {
  constructor(service) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      const data = await this.service.list({
        tipo: req.query.tipo,
        q: req.query.q,
        cat: req.query.cat,
        limit: req.query.limit,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  get = async (req, res, next) => {
    try {
      const data = await this.service.getById(req.params.id, {
        viewerId: req.user?.id ?? null,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  create = async (req, res, next) => {
    try {
      const data = await this.service.create({
        sellerId: req.user.id,
        input: req.body ?? {},
      });
      return res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  listOffers = async (req, res, next) => {
    try {
      const data = await this.service.listOffersForListing({
        listingId: req.params.id,
        userId: req.user.id,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  createOffer = async (req, res, next) => {
    try {
      const data = await this.service.createOffer({
        listingId: req.params.id,
        buyerId: req.user.id,
        amount: req.body?.amount,
        message: req.body?.message,
      });
      return res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  myOffers = async (req, res, next) => {
    try {
      const data = await this.service.myOffers({ buyerId: req.user.id });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  myListings = async (req, res, next) => {
    try {
      const data = await this.service.myListings({ sellerId: req.user.id });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  mySales = async (req, res, next) => {
    try {
      const data = await this.service.mySales({ sellerId: req.user.id });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  respondOffer = async (req, res, next) => {
    try {
      const data = await this.service.respondOffer({
        offerId: req.params.offerId,
        sellerId: req.user.id,
        action: req.body?.action || req.params.action,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}
