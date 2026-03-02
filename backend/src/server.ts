import 'dotenv/config';
import { app } from './app';
import { ensureTables } from './services/db';
import { ensureSeedUser } from './repositories/usersRepository';
import { ensureSeedAlerts } from './services/alertsService';
import { triggerProcessing, ensureSeedGubadleySites } from './services/sitesService';

const port = Number(process.env.PORT ?? 4000);
console.log('Starting server on port', process.env.PORT);

app.listen(port, async () => {
  await ensureTables();
  await ensureSeedUser();
  await ensureSeedAlerts();
  await ensureSeedGubadleySites();
  await triggerProcessing();
  console.log(`Youth Blossom backend listening on port ${port}`);
});
