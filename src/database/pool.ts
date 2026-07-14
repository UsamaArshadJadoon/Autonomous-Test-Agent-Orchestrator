import { DatabaseConnection } from './connection.js';
import { Logger } from '../logging/logger.js';

let globalConnection: DatabaseConnection | null = null;

export async function initializeDatabase(
  connectionString: string,
  logger: Logger
): Promise<DatabaseConnection> {
  if (globalConnection) {
    logger.warn('Database already initialized, returning existing connection');
    return globalConnection;
  }

  globalConnection = new DatabaseConnection(connectionString, logger);

  // Test connection
  try {
    await globalConnection.query('SELECT 1');
    logger.info('Database connection established and verified');
  } catch (error) {
    logger.error('Failed to verify database connection', error);
    globalConnection = null;
    throw error;
  }

  return globalConnection;
}

export function getDatabase(): DatabaseConnection {
  if (!globalConnection) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return globalConnection;
}

export async function closeDatabase(): Promise<void> {
  if (globalConnection) {
    await globalConnection.close();
    globalConnection = null;
  }
}
