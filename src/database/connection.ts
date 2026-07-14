import { Pool, PoolClient, QueryResult } from 'pg';
import { Logger } from '../logging/logger.js';

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

export class DatabaseConnection {
  private pool: Pool;
  private logger: Logger;

  constructor(connectionString: string, logger: Logger) {
    this.logger = logger;
    this.pool = new Pool({
      connectionString,
      max: 20,
      min: 5,
      idleTimeoutMillis: 300000,
      connectionTimeoutMillis: 30000
    });

    this.pool.on('error', (err: Error) => {
      this.logger.error('Unexpected error on idle client', err);
    });

    this.logger.info('Database pool initialized', {
      max: 20,
      min: 5,
      idleTimeoutMillis: 300000,
      connectionTimeoutMillis: 30000
    });
  }

  async query(text: string, params?: any[]): Promise<any[]> {
    const start = Date.now();
    try {
      const result: QueryResult = await this.pool.query(text, params);
      const duration = Date.now() - start;
      this.logger.debug(`Query executed in ${duration}ms`, {
        query: text,
        params: params?.length || 0,
        duration
      });
      return result.rows;
    } catch (error) {
      this.logger.error('Database query error', error);
      throw error;
    }
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      this.logger.debug('Transaction started');

      const result = await callback(client);

      await client.query('COMMIT');
      this.logger.debug('Transaction committed');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Transaction rolled back', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.logger.info('Database pool closed');
  }

  getPoolStats(): PoolStats {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}
