import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';

export async function getAdminOverview() {
  const [totalInvoices, pendingInvoices, paidInvoices, overdueInvoices, revenueAgg, pendingAgg] = await Promise.all([
    Invoice.countDocuments({}),
    Invoice.countDocuments({ status: 'PENDING' }),
    Invoice.countDocuments({ status: 'PAID' }),
    Invoice.countDocuments({ status: 'OVERDUE' }),
    Invoice.aggregate([{ $match: { status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Invoice.aggregate([
      { $match: { status: { $in: ['PENDING', 'OVERDUE'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const monthlyTrend = await Payment.aggregate([
    { $match: { status: 'SUCCEEDED' } },
    {
      $group: {
        _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 },
  ]);

  return {
    totalInvoices,
    pendingInvoices,
    paidInvoices,
    overdueInvoices,
    totalRevenue: revenueAgg[0]?.total || 0,
    pendingAmount: pendingAgg[0]?.total || 0,
    monthlyTrend,
  };
}
