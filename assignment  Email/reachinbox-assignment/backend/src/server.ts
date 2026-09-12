import app from "./app";
import { env } from "./config/env";
import { recoverMissingQueueJobs } from "./services/scheduler";

recoverMissingQueueJobs().catch(console.error);

app.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}`);
  console.log(`Bull Board on http://localhost:${env.PORT}/admin/queues`);
});
