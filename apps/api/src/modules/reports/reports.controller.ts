import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import { successResponse } from '../../utils/pagination';
import { resolveReportDateRange } from './reports.range';

export class ReportsController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await reportsService.getDashboardSummary(req.tenantId!);
      res.json(successResponse(summary));
    } catch (error) {
      next(error);
    }
  }

  async getRevenueChart(req: Request, res: Response, next: NextFunction) {
    try {
      const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
      const chartData = await reportsService.getRevenueChart(req.tenantId!, Number.isFinite(months) ? months : 6);
      res.json(successResponse(chartData));
    } catch (error) {
      next(error);
    }
  }

  async getBrokerSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 12;
      const data = await reportsService.getBrokerSummary(req.tenantId!, Number.isFinite(limit) ? limit : 12);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  }

  /** Date range: `from`+`to` (YYYY-MM-DD) or `preset` (30d|90d|6m|12m|ytd). Pickup-based load window. */
  async getOperationalAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to, preset } = resolveReportDateRange(req);
      const data = await reportsService.getOperationalAnalytics(req.tenantId!, from, to);
      res.json(successResponse({ ...data, preset: preset ?? null }));
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
