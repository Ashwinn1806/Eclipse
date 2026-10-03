async function queryNeon(sql: string, params: any[] = []) {
  const host = 'ep-nameless-river-b4w9giy1.c-6.us-east-2.aws.neon.tech';
  const db = 'neondb';
  const user = 'neondb_owner';
  const pass = 'npg_brKNl62cFyAT';
  
  const authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  
  const response = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Neon-Connection-String': `postgresql://${user}:${pass}@${host}/${db}?sslmode=require`
    },
    body: JSON.stringify({ query: sql, params })
  });

  const data = await response.json();
  return data;
}

async function main() {
  try {
    console.log('Testing Neon HTTP SQL API...');
    const result = await queryNeon('SELECT NOW(), current_database(), current_user;');
    console.log('Neon HTTP Result:', JSON.stringify(result, null, 2));

    const tables = await queryNeon(`SELECT table_name FROM information_schema.tables WHERE table_schema='public';`);
    console.log('Tables:', JSON.stringify(tables, null, 2));
  } catch (err: any) {
    console.error('HTTP Query Error:', err);
  }
}

main();
