import { Request, Response, NextFunction } from 'express';
import { lookupUsZip } from './geo.service';
import { successResponse } from '../../utils/pagination';

export const geoController = {
  async lookupZip(req: Request, res: Response, next: NextFunction) {
    try {
      const rawZip = req.params.zip;
      const zip = Array.isArray(rawZip) ? rawZip[0] : rawZip;
      const result = await lookupUsZip(zip);
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  },
};
