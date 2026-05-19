import { prisma } from '../../config/database';
import { notificationsService } from '../notifications/notifications.service';

interface ComplianceItem {
  id: string;
  entityType: 'DRIVER' | 'TRUCK' | 'TRAILER';
  entityId: string;
  entityName: string;
  itemType: string;
  expiryDate: Date;
  status: 'GREEN' | 'YELLOW' | 'RED';
  daysRemaining: number;
}

export class ComplianceService {
  /**
   * Get all compliance items across drivers and trucks for a company
   */
  async getOverview(tenantId: string) {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const [drivers, trucks] = await Promise.all([
      prisma.driver.findMany({
        where: { companyId: tenantId, isActive: true },
        select: {
          id: true, firstName: true, lastName: true,
          cdlExpiryDate: true, cdlState: true, medicalCardExpiry: true,
        },
      }),
      prisma.truck.findMany({
        where: { companyId: tenantId, isActive: true },
        select: {
          id: true, unitNumber: true, make: true, model: true,
          dotInspectionExpiry: true, irpExpiry: true, hvutExpiry: true, insuranceExpiry: true,
        },
      }),
    ]);

    const items: ComplianceItem[] = [];

    const getStatus = (d: Date): { status: 'GREEN' | 'YELLOW' | 'RED'; daysRemaining: number } => {
      const diff = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (d < now) return { status: 'RED', daysRemaining: diff };
      if (d <= thirtyDays) return { status: 'YELLOW', daysRemaining: diff };
      return { status: 'GREEN', daysRemaining: diff };
    };

    // Driver compliance
    for (const driver of drivers) {
      const name = `${driver.firstName} ${driver.lastName}`;

      const cdl = getStatus(driver.cdlExpiryDate);
      items.push({
        id: `driver-cdl-${driver.id}`,
        entityType: 'DRIVER',
        entityId: driver.id,
        entityName: name,
        itemType: 'CDL License',
        expiryDate: driver.cdlExpiryDate,
        ...cdl,
      });

      const med = getStatus(driver.medicalCardExpiry);
      items.push({
        id: `driver-med-${driver.id}`,
        entityType: 'DRIVER',
        entityId: driver.id,
        entityName: name,
        itemType: 'Medical Card',
        expiryDate: driver.medicalCardExpiry,
        ...med,
      });
    }

    // Truck compliance
    for (const truck of trucks) {
      const name = `${truck.unitNumber} (${truck.make} ${truck.model})`;

      const dot = getStatus(truck.dotInspectionExpiry);
      items.push({
        id: `truck-dot-${truck.id}`, entityType: 'TRUCK', entityId: truck.id,
        entityName: name, itemType: 'DOT Inspection', expiryDate: truck.dotInspectionExpiry, ...dot,
      });

      const irp = getStatus(truck.irpExpiry);
      items.push({
        id: `truck-irp-${truck.id}`, entityType: 'TRUCK', entityId: truck.id,
        entityName: name, itemType: 'IRP Registration', expiryDate: truck.irpExpiry, ...irp,
      });

      const hvut = getStatus(truck.hvutExpiry);
      items.push({
        id: `truck-hvut-${truck.id}`, entityType: 'TRUCK', entityId: truck.id,
        entityName: name, itemType: 'Form 2290 (HVUT)', expiryDate: truck.hvutExpiry, ...hvut,
      });

      const ins = getStatus(truck.insuranceExpiry);
      items.push({
        id: `truck-ins-${truck.id}`, entityType: 'TRUCK', entityId: truck.id,
        entityName: name, itemType: 'Insurance', expiryDate: truck.insuranceExpiry, ...ins,
      });
    }

    // Sort: RED first, then YELLOW, then GREEN, within same status by days remaining
    items.sort((a, b) => {
      const statusOrder = { RED: 0, YELLOW: 1, GREEN: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return a.daysRemaining - b.daysRemaining;
    });

    const summary = {
      total: items.length,
      expired: items.filter(i => i.status === 'RED').length,
      warning: items.filter(i => i.status === 'YELLOW').length,
      valid: items.filter(i => i.status === 'GREEN').length,
    };

    await notificationsService.syncFromCompliance(tenantId, items);

    return { items, summary };
  }
}

export const complianceService = new ComplianceService();
