/* Runs the Lanczos resize off the main thread so the editor never freezes. */
import { resizeJob } from './imageResize';

self.onmessage = (e) => {
  const { id, job } = e.data;
  try {
    const out = resizeJob(job);
    self.postMessage({ id, out }, [out.buffer]);
  } catch (err) {
    self.postMessage({ id, error: err?.message || 'Resize failed' });
  }
};
