import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env';
import { generalRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

import authRoutes from './routes/authRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import paymentRoutes from './routes/paymentRoutes';
import receiptRoutes from './routes/receiptRoutes';
import clientRoutes from './routes/clientRoutes';
import adminRoutes from './routes/adminRoutes';
import webhookRoutes from './routes/webhookRoutes';

export function createApp(): Express {
  const app = express();

  // Trust the first proxy hop (Render/Vercel) so req.ip and secure cookies
  // behave correctly behind a load balancer.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    })
  );

  const allowedOrigins = env.clientUrl.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/non-browser requests (no Origin header) and any
        // explicitly configured client origin. No wildcard in production.
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  // --- Stripe webhook: MUST be mounted before express.json() below, and
  // uses its own express.raw() parser (declared in webhookRoutes.ts), so the
  // exact raw bytes Stripe signed reach stripe.webhooks.constructEvent()
  // untouched. This ordering is load-bearing — moving it after the JSON
  // parser silently breaks signature verification. ---
  app.use('/api/webhooks', webhookRoutes);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize()); // strips keys starting with '$' or containing '.' from req.body/query/params

  if (!env.isProduction) {
    app.use(morgan('dev'));
  } else {
    app.use(
      morgan('combined', {
        stream: { write: (message: string) => logger.info(message.trim()) },
      })
    );
  }

  app.use('/api', generalRateLimiter);

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ success: true, message: 'VaultPay API is healthy', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/receipts', receiptRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
