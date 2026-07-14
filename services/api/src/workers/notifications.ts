import { Worker } from 'bullmq'; import { config } from '../config.js'; import { logger } from '../utils/logger.js';
export const notificationWorker=new Worker('notifications', async job=>logger.info({job:job.name,data:job.data}), {connection:{url:config.REDIS_URL}});
