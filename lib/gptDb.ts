import { pool } from './db';

export type Sql = <T = Record<string, unknown>[]>(sql: string, params?: unknown[]) => Promise<T>;
export async function transaction<T>(work: (sql: Sql) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const sql: Sql = async <R>(statement: string, params?: unknown[]) => {
      const [rows] = await connection.execute(statement, params);
      return rows as R;
    };
    const result = await work(sql);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
