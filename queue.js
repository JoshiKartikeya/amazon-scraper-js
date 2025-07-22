// queue.js
import PQueue from 'p-queue';
import dotenv from 'dotenv';
dotenv.config();

export const queue = new PQueue({
  concurrency: parseInt(process.env.CONCURRENCY) || 2,
});