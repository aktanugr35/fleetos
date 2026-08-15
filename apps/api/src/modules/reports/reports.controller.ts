import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import { successResponse } from '../../utils/pagination';
import { resolveReportDateRange } from './reports.range';
import { AppError } from '../../middleware/errorHandler.middleware';
import { settlementsService } from '../settlements/settlements.service';
import { grossRevenueFromLoad } from '../settlements/settlements.eligible';
import { eligibleSettlementQuerySchema } from '../settlements/settlements.schema';
import {
  buildDriverLoadsWorkbook,
  driverLoadsFileName,
  type DriverLoadExportRow,
} from './driver-loads.export';

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

  /** Excel export of the loads a statement would cover for one driver and period. */
  async exportDriverLoads(req: Request, res: Response, next: NextFunction) {
    try {
      const query = eligibleSettlementQuerySchema.parse(req.query);
      const { driver, loads, periodStart, periodEnd } = await settlementsService.listDriverLoadsForPeriod(
        req.tenantId!,
        query.driverId,
        query.weekStartDate,
        query.weekEndDate
      );

      const rows: DriverLoadExportRow[] = loads.map((load) => ({
        loadNumber: load.loadNumber,
        pickupDate: load.pickupDate,
        pickupLocation: load.pickupLocation,
        deliveryLocation: load.deliveryLocation,
        stops: load.stops,
        brokerName: load.brokerName,
        driverName: `${load.driver.firstName} ${load.driver.lastName}`.trim(),
        bookedByName: load.bookedByDispatcher
          ? `${load.bookedByDispatcher.firstName} ${load.bookedByDispatcher.lastName}`.trim()
          : null,
        totalCents: grossRevenueFromLoad(load),
      }));

      const meta = {
        driverName: `${driver.firstName} ${driver.lastName}`.trim(),
        periodStart,
        periodEnd,
      };
      const workbook = buildDriverLoadsWorkbook(rows, meta);
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${driverLoadsFileName(meta)}"`);
      res.send(Buffer.from(buffer));
    } catch (error) {
      next(error);
    }
  }

  async getDriverEarningsDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.linkedDriverId) {
        throw new AppError(403, 'NO_DRIVER_PROFILE', 'No active driver profile is linked to this account');
      }
      const data = await reportsService.getDriverEarningsDashboard(req.tenantId!, req.linkedDriverId);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
