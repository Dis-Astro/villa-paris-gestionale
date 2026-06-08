const http = require('http');

const targetHost = process.env.NEXT_HOST || 'localhost';
const targetPort = Number(process.env.NEXT_PORT || 3000);
const listenPort = Number(process.env.PROXY_PORT || 8001);

const server = http.createServer((clientReq, clientRes) => {
  const options = {
    hostname: targetHost,
    port: targetPort,
    path: clientReq.url,
    method: clientReq.method,
    headers: { ...clientReq.headers, host: `${targetHost}:${targetPort}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', (err) => {
    clientRes.writeHead(502, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({ error: 'Proxy error', detail: err.message }));
  });

  clientReq.pipe(proxyReq, { end: true });
});

server.listen(listenPort, '0.0.0.0', () => {
  console.log(`[proxy] Running on :${listenPort} -> ${targetHost}:${targetPort}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
