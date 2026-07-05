import { Request, Response, NextFunction } from 'express';
import { lookupUsZip } from './geo.service';
import { successResponse } from '../../utils/pagination';

export const geoController = {
  async lookupZip(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await lookupUsZip(req.params.zip);
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  },
};
