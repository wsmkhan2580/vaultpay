/**
 * Creates an initial ADMIN user for local development/demo purposes.
 * Usage: npm run seed
 *
 * Reads credentials from env vars SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD if
 * set, otherwise falls back to a clearly-marked demo password that MUST be
 * changed immediately after first login in any shared environment.
 */
import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { User, SALT_ROUNDS } from '../models/User';
import { logger } from './logger';

async function seed() {
  await connectDatabase();

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@nexuscorporateservices.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe!2026#Vault';

  const existing = await User.findOne({ email });
  if (existing) {
    logger.info('Seed admin already exists, skipping', { email });
  } else {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({
      name: 'Evelyn Croft',
      email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    logger.info('Seed admin created', { email });
    // eslint-disable-next-line no-console
    console.log(`\nAdmin created:\n  email: ${email}\n  password: ${password}\n  (change this immediately)\n`);
  }

  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed', err);
  process.exit(1);
});
