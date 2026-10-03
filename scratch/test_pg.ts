import tls from 'tls';
import dns from 'dns';

dns.lookup('ep-nameless-river-b4w9giy1-pooler.c-6.us-east-2.aws.neon.tech', (err, address, family) => {
  console.log('DNS lookup address:', address, 'family:', family, 'err:', err);
  if (!address) return;

  const socket = tls.connect(5432, address, { servername: 'ep-nameless-river-b4w9giy1-pooler.c-6.us-east-2.aws.neon.tech', rejectUnauthorized: false }, () => {
    console.log('TLS connection connected! Authorized:', socket.authorized);
    socket.destroy();
  });

  socket.on('error', (e) => {
    console.error('TLS connection error:', e);
  });
});
