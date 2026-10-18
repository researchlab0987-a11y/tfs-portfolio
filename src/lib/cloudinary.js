/**
 * Cloudinary unsigned uploads, straight to the REST endpoint (no widget
 * script). Without configuration the editor falls back to pasting a URL.
 */
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const uploadsEnabled = Boolean(cloudName && uploadPreset);

export function uploadImage(file, onProgress, name) {
  return new Promise((resolve, reject) => {
    if (!uploadsEnabled) return reject(new Error('Uploads are not set up. Paste an image link instead.'));
    if (!file?.type?.startsWith('image/')) return reject(new Error('Choose an image file.'));
    if (file.size > 10 * 1024 * 1024) return reject(new Error('Images must be under 10 MB.'));

    const body = new FormData();
    body.append('file', file, name || file.name || 'image');
    body.append('upload_preset', uploadPreset);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status < 300 && res.secure_url) resolve(res.secure_url);
        else reject(new Error(res?.error?.message || `Upload failed (${xhr.status}).`));
      } catch {
        reject(new Error('Upload failed: unreadable response.'));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed: network error.'));
    xhr.send(body);
  });
}

/** Resize Cloudinary images on the fly; other hosts pass through untouched. */
export function optimized(url, width = 1200) {
  if (!url || !url.includes('res.cloudinary.com') || url.includes('/upload/w_')) return url;
  return url.replace('/upload/', `/upload/w_${width},f_auto,q_auto/`);
}
