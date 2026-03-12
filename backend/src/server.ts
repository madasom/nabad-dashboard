import 'dotenv/config';
import { app } from './app';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { ensureTables } from './services/db';
import { ensureSeedUser } from './repositories/usersRepository';
import { ensureSeedAlerts } from './services/alertsService';
import { triggerProcessing, ensureSeedGubadleySites } from './services/sitesService';

const defaultPort = process.env.NODE_ENV === 'production' ? 3126 : 4000;
const port = Number(process.env.PORT ?? defaultPort);
const host = process.env.HOST ?? '0.0.0.0';

const keyPath = process.env.SSL_KEY_PATH ?? path.resolve(process.cwd(), 'ssl/key.pem');
const certPath = process.env.SSL_CERT_PATH ?? path.resolve(process.cwd(), 'ssl/certificate.pem');
// const useHttps = fs.existsSync(keyPath) && fs.existsSync(certPath);
const useHttps = false

console.log(`Starting server on port ${port} (${useHttps ? 'https' : 'http'})`);

const start = async () => {
  await ensureTables();
  await ensureSeedUser();
  await ensureSeedAlerts();
  await ensureSeedGubadleySites();
  await triggerProcessing();

  if (useHttps) {
    const key = fs.readFileSync(keyPath, 'utf8');
    const cert = fs.readFileSync(certPath, 'utf8');
    https.createServer({ key, cert }, app).listen(port, host, () => {
      console.log(`DawaSom backend listening on https://${host}:${port}`);
    });
  } else {
    http.createServer(app).listen(port, host, () => {
      console.log(`DawaSom backend listening on http://${host}:${port}`);
    });
  }
};

start().catch((err) => {
  console.error('Server failed to start', err);
  process.exit(1);
});
