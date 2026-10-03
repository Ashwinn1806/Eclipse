async function queryNeon(sql: string, params: any[] = []) {
  const host = 'ep-nameless-river-b4w9giy1.c-6.us-east-2.aws.neon.tech';
  const pass = 'npg_brKNl62cFyAT';
  const connStr = 'postgresql://neondb_owner:npg_brKNl62cFyAT@ep-nameless-river-b4w9giy1.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';
  
  const response = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pass}`,
      'Neon-Connection-String': connStr,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql, params })
  });

  const data = await response.json();
  return data;
}

async function main() {
  try {
    console.log('Testing Neon HTTP SQL API with Neon-Connection-String...');
    const result = await queryNeon('SELECT NOW(), current_database(), current_user;');
    console.log('Neon HTTP Result:', JSON.stringify(result, null, 2));

    const tables = await queryNeon(`SELECT table_name FROM information_schema.tables WHERE table_schema='public';`);
    console.log('Tables:', JSON.stringify(tables, null, 2));
  } catch (err: any) {
    console.error('HTTP Query Error:', err);
  }
}

main();
