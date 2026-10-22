import { parentPort, workerData } from 'node:worker_threads';
import { normalizePhoto } from './photo-image';
void normalizePhoto(Buffer.from(workerData)).then(bytes => parentPort?.postMessage(bytes)).catch(() => parentPort?.postMessage(null));
