# Safe analytics update

Added browser/version, broad model hints, language/locale/timezone, battery when the browser exposes it, CPU-thread and RAM hints, sanitized referrer, click count, max scroll, and a random first-party Visitor ID.

The admin journal can block/unblock that Visitor ID. This is not a hardware fingerprint and can be reset by clearing browser storage.

Not included: camera/microphone/headphone names, clipboard contents, WebRTC local-network discovery, Canvas/WebGL fingerprint hashes, or hidden 2D/3D fingerprint rendering.

Run `schema-safe-analytics-and-block.sql` once in the same Cloudflare D1 database, then deploy `cloudflare-worker.js`. The site `visitor.js` is already updated in this ZIP.
