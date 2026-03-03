import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

// ---------------------------------------------------------------------------
// Importiere Mock-Daten aus den anderen Routen (Re-Export Helpers)
// In einer echten App wuerden diese aus einer Datenbank kommen.
// Hier bauen wir die Dashboard-Aggregation direkt aus den API-Endpunkten.
// ---------------------------------------------------------------------------

// Wir nutzen interne Helper um die Daten direkt zu holen, ohne HTTP-Requests.
// Da alle Mock-Daten in-memory sind, exportieren wir Accessor-Funktionen.

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard/stats
// Aggregierte Statistiken fuer das Dashboard
// ---------------------------------------------------------------------------

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { assignedTo } = req.query;
    const userQs = assignedTo ? `?assignedTo=${assignedTo}` : '';

    // Parallel interne API Calls
    const [dealsRes, appointmentsRes, tasksRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/deals/stats${userQs}`),
      fetch(`${baseUrl}/api/v1/appointments/stats${userQs}`),
      fetch(`${baseUrl}/api/v1/tasks/stats${userQs ? `?assignedTo=${assignedTo}` : ''}`),
    ]);

    const dealsData = await dealsRes.json();
    const appointmentsData = await appointmentsRes.json();
    const tasksData = await tasksRes.json();

    res.json({
      data: {
        deals: dealsData.data,
        appointments: appointmentsData.data,
        tasks: tasksData.data,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard/monthly
// Monatliche Statistiken: Abschluesse + Termine pro Monat + Provision
// ---------------------------------------------------------------------------

router.get('/monthly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { assignedTo } = req.query;
    const userQs = assignedTo ? `?assignedTo=${assignedTo}` : '';

    // Hole alle Deals und Termine
    const [dealsRes, appointmentsRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/deals${userQs}&pageSize=1000`),
      fetch(`${baseUrl}/api/v1/appointments${userQs}&pageSize=1000`),
    ]);

    const dealsBody = await dealsRes.json();
    const appointmentsBody = await appointmentsRes.json();

    const deals = dealsBody.data || [];
    const appointments = appointmentsBody.data || [];

    // Monats-Aggregation: letzte 12 Monate
    const months: {
      month: string; // YYYY-MM
      label: string; // z.B. "Mär 2026"
      wonDeals: number;
      wonValue: number;
      lostDeals: number;
      totalAppointments: number;
      completedAppointments: number;
      provision: number; // 5% auf wonValue
    }[] = [];

    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      // Gewonnene Deals in diesem Monat (basierend auf closedAt)
      const wonInMonth = deals.filter((deal: { stage: string; closedAt: string | null }) => {
        if (deal.stage !== 'GEWONNEN' || !deal.closedAt) return false;
        const closed = new Date(deal.closedAt);
        return closed.getFullYear() === d.getFullYear() && closed.getMonth() === d.getMonth();
      });

      const lostInMonth = deals.filter((deal: { stage: string; closedAt: string | null }) => {
        if (deal.stage !== 'VERLOREN' || !deal.closedAt) return false;
        const closed = new Date(deal.closedAt);
        return closed.getFullYear() === d.getFullYear() && closed.getMonth() === d.getMonth();
      });

      const wonValue = wonInMonth.reduce((s: number, deal: { value: number }) => s + deal.value, 0);

      // Termine in diesem Monat
      const appointmentsInMonth = appointments.filter((a: { appointmentDate: string | null }) => {
        if (!a.appointmentDate) return false;
        const ad = new Date(a.appointmentDate);
        return ad.getFullYear() === d.getFullYear() && ad.getMonth() === d.getMonth();
      });

      const completedInMonth = appointmentsInMonth.filter(
        (a: { status: string }) => a.status === 'DURCHGEFUEHRT',
      );

      months.push({
        month: key,
        label,
        wonDeals: wonInMonth.length,
        wonValue,
        lostDeals: lostInMonth.length,
        totalAppointments: appointmentsInMonth.length,
        completedAppointments: completedInMonth.length,
        provision: Math.round(wonValue * 0.05 * 100) / 100,
      });
    }

    res.json({ data: months });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard/provision
// Provisions-Berechnung pro Verkaeufer fuer einen Monat
// ---------------------------------------------------------------------------

router.get('/provision', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { month } = req.query; // Format: YYYY-MM

    // Hole alle Deals und User
    const [dealsRes, usersRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/deals?pageSize=1000`),
      fetch(`${baseUrl}/api/v1/users`),
    ]);

    const dealsBody = await dealsRes.json();
    const usersBody = await usersRes.json();

    const deals = dealsBody.data || [];
    const users = usersBody.data || [];

    // Ziel-Monat bestimmen
    const targetMonth = typeof month === 'string' ? month : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = targetMonth.split('-');
    const targetYear = parseInt(yearStr, 10);
    const targetMon = parseInt(monthStr, 10) - 1;

    // Gewonnene Deals im Zielmonat
    const wonDeals = deals.filter((deal: { stage: string; closedAt: string | null }) => {
      if (deal.stage !== 'GEWONNEN' || !deal.closedAt) return false;
      const closed = new Date(deal.closedAt);
      return closed.getFullYear() === targetYear && closed.getMonth() === targetMon;
    });

    // Gruppierung nach Verkaeufer
    const byUser: Record<string, { deals: { title: string; value: number; closedAt: string }[]; totalValue: number; provision: number }> = {};

    for (const deal of wonDeals) {
      const userId = (deal as { assignedTo: string | null }).assignedTo || 'unassigned';
      if (!byUser[userId]) {
        byUser[userId] = { deals: [], totalValue: 0, provision: 0 };
      }
      byUser[userId].deals.push({
        title: (deal as { title: string }).title,
        value: (deal as { value: number }).value,
        closedAt: (deal as { closedAt: string }).closedAt,
      });
      byUser[userId].totalValue += (deal as { value: number }).value;
    }

    // Provision berechnen (5%)
    for (const userId of Object.keys(byUser)) {
      byUser[userId].provision = Math.round(byUser[userId].totalValue * 0.05 * 100) / 100;
    }

    // User-Infos anreichern
    const provisions = Object.entries(byUser).map(([userId, data]) => {
      const user = users.find((u: { id: string }) => u.id === userId);
      return {
        userId,
        userName: user ? `${(user as { firstName: string }).firstName} ${(user as { lastName: string }).lastName}` : 'Unbekannt',
        userRole: user ? (user as { role: string }).role : '',
        deals: data.deals,
        totalValue: data.totalValue,
        provisionRate: 0.05,
        provision: data.provision,
      };
    });

    const totalValue = provisions.reduce((s, p) => s + p.totalValue, 0);
    const totalProvision = provisions.reduce((s, p) => s + p.provision, 0);

    res.json({
      data: {
        month: targetMonth,
        provisions,
        summary: {
          totalValue,
          totalProvision,
          totalDeals: wonDeals.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
