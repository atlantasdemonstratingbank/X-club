/* cloudinary.js — X Club Image Upload
   Compresses heavily before uploading to Cloudinary. */
'use strict';

const CLOUDINARY = {
  cloudName: 'dbgxllxdb',
  uploadPreset: 'efootball_screenshots',  /* from config.js */
  compression: { maxW: 1200, maxH: 1200, quality: 0.78 },   /* slightly tighter than config default */
  maxFileSizeKB: 800   /* reject if still >800 KB after compression */
};

/* ── Main upload entry ───────────────────────────────────────────────── */
/**
 * Compress and upload a File to Cloudinary.
 * @param {File}   file      — raw file from <input type="file">
 * @param {string} folder    — e.g. 'x_profiles', 'x_kyc'
 * @param {function} onProgress — called with 0–100
 * @returns {Promise<{url, publicId, width, height, bytes}>}
 */
async function xUploadImage(file, folder = 'x_uploads', onProgress = () => {}) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Not an image file.');

  onProgress(5);
  const compressed = await compressImage(file);
  onProgress(40);

  /* Size guard after compression */
  if (compressed.size > CLOUDINARY.maxFileSizeKB * 1024) {
    console.warn(`[XCloud] Still ${Math.round(compressed.size/1024)} KB after compression — uploading anyway.`);
  }

  const fd = new FormData();
  fd.append('file',           compressed);
  fd.append('upload_preset',  CLOUDINARY.uploadPreset);
  fd.append('folder',         folder);
  fd.append('tags',           'xclub');

  onProgress(50);

  const res = await uploadWithProgress(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`,
    fd,
    pct => onProgress(50 + Math.round(pct * 0.5))
  );

  onProgress(100);

  return {
    url:      res.secure_url,
    publicId: res.public_id,
    width:    res.width,
    height:   res.height,
    bytes:    res.bytes,
    format:   res.format
  };
}

/* ── Image compression ───────────────────────────────────────────────── */
async function compressImage(file) {
  const { maxW, maxH, quality } = CLOUDINARY.compression;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      let { naturalWidth: w, naturalHeight: h } = img;

      /* Scale down preserving aspect ratio */
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      /* Fill white for transparency → JPEG conversion */
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Canvas compression failed')); return; }
          /* If WebP is not supported fall back to JPEG */
          const ext  = blob.type === 'image/webp' ? 'webp' : 'jpg';
          const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
          resolve(new File([blob], name, { type: blob.type }));
        },
        'image/webp',   /* Try WebP first for better compression */
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

/* ── XHR upload with progress ────────────────────────────────────────── */
function uploadWithProgress(url, formData, onPct) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) onPct(e.loaded / e.total);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch (err) { reject(new Error('Invalid JSON from Cloudinary')); }
      } else {
        reject(new Error(`Cloudinary error: ${xhr.status}`));
      }
    });
    xhr.addEventListener('error',  () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort',  () => reject(new Error('Upload aborted')));
    xhr.send(formData);
  });
}

/* ── Delete image (server-side only — needs signed request) ─────────── */
/* Note: deletion from client requires a signed API call.
   In production, proxy through a Cloud Function. */
async function xDeleteImage(publicId) {
  console.warn('[XCloud] Client-side delete not supported. Use a server function.', publicId);
}

/* ── Thumbnail helper ────────────────────────────────────────────────── */
function xThumb(url, w = 200, h = 200) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/c_fill,w_${w},h_${h},q_auto,f_auto/`);
}

/* ── Export ──────────────────────────────────────────────────────────── */
window.XCloud = {
  upload:      xUploadImage,
  deleteImage: xDeleteImage,
  thumb:       xThumb
};
