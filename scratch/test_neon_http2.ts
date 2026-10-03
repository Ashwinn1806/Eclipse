import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const connectionString = process.env.DATABASE_URL || '';
  console.log('Testing neon() HTTP query with connection string:', connectionString);

  const sql = neon(connectionString);

  try {
    const res = await sql`SELECT NOW(), current_database(), current_user;`;
    console.log('SUCCESS VIA NEON HTTP SQL!');
    console.log('QueryResult:', res);

    const users = await sql`SELECT * FROM users;`;
    console.log('Users count:', users.length);
    console.log('Users:', users);
  } catch (err: any) {
    console.error('Neon HTTP Error:', err);
  }
}

main();
