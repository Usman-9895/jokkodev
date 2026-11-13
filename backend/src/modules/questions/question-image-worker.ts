import {parentPort, workerData} from 'node:worker_threads';
import {normalizePhoto} from '../users/photo-image';
void normalizePhoto(Buffer.from(workerData), true).then(bytes => parentPort?.postMessage(bytes)).catch(() => parentPort?.postMessage(null));
