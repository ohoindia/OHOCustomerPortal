import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export type DbRow = Record<string, unknown>;
export type SqlValue = string | number | boolean | Date | null;
export type Connection = Pool | PoolConnection;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool?: Pool;
  constructor(private readonly config: ConfigService) {}
  private getPool() {
    if (!this.pool) {
      if (!this.config.get('DB_NAME') || !this.config.get('DB_USER')) {
        throw new ServiceUnavailableException('Configure DB_NAME and DB_USER in Lambda environment variables or the local server/.env.');
      }
      this.pool = createPool({
        host: this.config.get('DB_HOST', 'localhost'),
        port: Number(this.config.get('DB_PORT', 3306)),
        user: this.config.get<string>('DB_USER'),
        password: this.config.get<string>('DB_PASSWORD', ''),
        database: this.config.get<string>('DB_NAME'),
        timezone: this.config.get('DB_TIMEZONE', '+05:30'),
        ssl: this.config.get('DB_SSL') === 'true' ? { rejectUnauthorized: true } : undefined,
        connectionLimit: 10,
        supportBigNumbers: true,
        bigNumberStrings: true,
        typeCast(field, next) {
          if (field.type === 'TINY' && field.length === 1) {
            const value = field.string();
            return value === null ? null : value === '1';
          }
          if (field.type === 'BIT' && field.length === 1) {
            const value = field.buffer();
            return value === null ? null : value[0] === 1;
          }
          return next();
        },
      });
    }
    return this.pool;
  }
  async rows(sql: string, values: SqlValue[] = [], connection?: Connection): Promise<DbRow[]> {
    const [rows] = await (connection ?? this.getPool()).execute<RowDataPacket[]>(sql, values);
    return rows;
  }
  async execute(sql: string, values: SqlValue[] = [], connection?: Connection) {
    const [result] = await (connection ?? this.getPool()).execute<ResultSetHeader>(sql, values);
    return result;
  }
  async transaction<T>(work: (connection: PoolConnection) => Promise<T>, lockName?: string): Promise<T> {
    const connection = await this.getPool().getConnection();
    let locked = false;
    let begun = false;
    try {
      if (lockName) {
        const locks = await this.rows('SELECT GET_LOCK(?, 10) AS Acquired', [lockName], connection);
        if (Number(locks[0]?.Acquired) !== 1) throw new ServiceUnavailableException('Please retry your request.');
        locked = true;
      }
      await connection.beginTransaction();
      begun = true;
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      if (begun) await connection.rollback();
      throw error;
    } finally {
      try {
        if (locked) await this.rows('SELECT RELEASE_LOCK(?) AS Released', [lockName!], connection);
      } finally { connection.release(); }
    }
  }
  async onModuleDestroy() { await this.pool?.end(); }
}
