import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { env } from '../config/env';

async function migrate() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const migrationPath = path.join(__dirname, 'migrations', '0001_initial.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    await client.query(sql);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(process.exit.bind(process, 1));
