import { Client } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Connecting with pg Client to:', connectionString);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully via pg!');
    const res = await client.query('SELECT NOW(), current_database(), current_user;');
    console.log('QueryResult:', res.rows);
  } catch (err: any) {
    console.error('pg Connection error:', err);
  } finally {
    await client.end();
  }
}

main();
