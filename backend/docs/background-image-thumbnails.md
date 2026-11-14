# Background image thumbnails

Uploads using `thumbnailDiskStorage` now save and validate the original without
waiting for WebP thumbnail encoding. This applies to date checks, deviations and
the other modules already using the shared image storage helper. API response
fields and frontend code are unchanged. Request-file attachments retain their
existing handling and do not generate thumbnails.

## Upload lifecycle

1. Multer writes the original file. Sharp decodes the image's pixels with strict
   error handling, rejecting invalid/truncated input before the controller saves.
   Validation uses a buffer to avoid retained file handles during cleanup on Windows.
2. The controller/service saves the associated database records as before.
3. A global interceptor persists thumbnail jobs only after the handler succeeds.
   The request waits for these small job-file writes, not thumbnail encoding.
4. A worker in the backend process polls every 500 ms and generates thumbnails
   with bounded concurrency. The existing image endpoint serves the original
   while a thumbnail is unavailable, including when a job ultimately fails.

Source validation still requires image decoding; network transfer, validation,
database work and frontend refetches remain part of upload latency. Only thumbnail
generation has moved off the request's awaited path.

## Persistence and retries

Jobs live in `uploads/.thumbnail-jobs` on the same persistent volume as images.
No Redis, database migration or extra package is required. The current Compose
deployment has one backend process and already persists `/app/uploads`.
Queue deduplication and the concurrency limit are per process. Multiple backend
processes sharing uploads require a shared queue/locking design before scaling.

Pending jobs remain on disk while running and resume after a restart. On startup,
the backend also walks existing upload directories and queues originals that lack
thumbnails, excluding `request-files` and the queue directory. This repairs uploads
saved just before a crash between database commit and job persistence. The scan
checks files, not database references; it can also create a thumbnail for an
already-orphaned original, but never adds database records or modifies originals.
The first startup with many existing images can take longer to scan/enqueue them.

Transient failures retry with exponential backoff. With the defaults, a failed
first attempt waits 1 second, the second waits 2 seconds, and the third failure
ends automatic retries. Terminal failures are logged and their job JSON is
retained with `failed: true`, including across restarts. Once the underlying
problem is fixed, remove the specific failed job JSON and restart to let recovery
queue it again, or use the existing `npm run thumbnails:generate` repair script.

If job persistence itself fails after the database save, the upload still succeeds
and an error is logged: the saved original remains accessible. Startup recovery
will rediscover the missing thumbnail once storage is writable again. Database
save failures do not enqueue work and retain the controllers' existing upload
cleanup. Deletion before a job runs drops that job. Deletion during encoding
also removes the generated thumbnail instead of leaving a new orphan.

## Configuration

| Variable | Default | Allowed range |
| --- | --- | --- |
| `IMAGE_THUMBNAIL_CONCURRENCY` | `2` | 1–8 simultaneous thumbnail jobs per backend process |
| `IMAGE_THUMBNAIL_MAX_ATTEMPTS` | `3` | 1–10 total attempts per job |
| `IMAGE_THUMBNAIL_RETRY_DELAY_MS` | `1000` | 1–60,000 ms initial retry delay, doubled after each failure |

Thumbnail dimensions/quality remain 640 px maximum edge and WebP quality 80.
Writes use temporary filenames and atomic rename. Normal Nest shutdown waits
for active jobs and leaves waiting jobs persisted. Abrupt exits retain job files
for the next process. Sharp's file cache is disabled because upload filenames
are unique and retained file handles can prevent cleanup on Windows.
