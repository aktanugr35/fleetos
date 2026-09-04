import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import { successResponse } from '../../utils/pagination';
import { resolveReportDateRange } from './reports.range';
import { settlementsService } from '../settlements/settlements.service';
import { grossRevenueFromLoad } from '../settlements/settlements.eligible';
import { eligibleSettlementQuerySchema } from '../settlements/settlements.schema';
import {
  buildDriverLoadsWorkbook,
  driverLoadsFileName,
  type DriverLoadExportRow,
} from './driver-loads.export';

/** Sentinel accepted in place of a driver id to export every driver's loads. */
export const ALL_DRIVERS = 'all';

interface ExportableLoad {
  loadNumber: string;
  pickupDate: Date;
  pickupLocation: string;
  deliveryLocation: string;
  stops: { sequence: number; location: string }[];
  brokerName: string;
  driver: { firstName: string; lastName: string };
  bookedByDispatcher: { firstName: string; lastName: string } | null;
  rateTotal: number;
  detentionPay?: number | null;
  lumperFee?: number | null;
  tonuAmount?: number | null;
}

function toExportRow(load: ExportableLoad): DriverLoadExportRow {
  return {
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
  };
}

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

  /**
   * Excel export of the loads a statement would cover for a period.
   * `driverId=all` exports the whole fleet instead of a single driver.
   */
  async exportDriverLoads(req: Request, res: Response, next: NextFunction) {
    try {
      const query = eligibleSettlementQuerySchema.parse(req.query);

      const result =
        query.driverId === ALL_DRIVERS
          ? await settlementsService
              .listFleetLoadsForPeriod(req.tenantId!, query.weekStartDate, query.weekEndDate)
              .then((r) => ({ ...r, driverName: 'All drivers' }))
          : await settlementsService
              .listDriverLoadsForPeriod(
                req.tenantId!,
                query.driverId,
                query.weekStartDate,
                query.weekEndDate
              )
              .then((r) => ({
                ...r,
                driverName: `${r.driver.firstName} ${r.driver.lastName}`.trim(),
              }));

      const { loads, periodStart, periodEnd } = result;
      const rows: DriverLoadExportRow[] = loads.map(toExportRow);

      const meta = {
        driverName: result.driverName,
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

}

export const reportsController = new ReportsController();
