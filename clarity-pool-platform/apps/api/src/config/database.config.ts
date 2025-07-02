/**
 * Database Connection Strategy for Clarity Pool Platform
 *
 * Development: Session Pooler (supports all Prisma features)
 * Production: Transaction Pooler (better for serverless)
 */

export const getDatabaseUrl = () => {
  const env = process.env.NODE_ENV || 'development';
  const baseUrl = process.env.DATABASE_URL;

  if (!baseUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  // In production, add pgbouncer parameters for transaction pooling
  if (env === 'production' && baseUrl.includes('pooler.supabase.com:6543')) {
    const url = new URL(baseUrl);
    url.searchParams.set('pgbouncer', 'true');
    url.searchParams.set('connection_limit', '1');
    return url.toString();
  }

  return baseUrl;
};

export const databaseConfig = {
  // For schema operations, always use direct connection
  schemaUrl: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,

  // For runtime queries, use pooled connection
  poolUrl: getDatabaseUrl(),

  // Prisma connection settings
  prismaOptions: {
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn' as const, 'error' as const]
        : ['error' as const],
    errorFormat: 'pretty' as const,
  },
};
