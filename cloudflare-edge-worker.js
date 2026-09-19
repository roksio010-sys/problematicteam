/*
 * Cloudflare edge gate for the GitHub Pages custom domain.
 *
 * Route this Worker to: your-domain.example/*
 * Environment variables:
 *   ANALYTICS_WORKER_URL = https://pmt-visitor-log.roksio010.workers.dev
 *   EDGE_SHARED_SECRET   = a long random secret (same value in the analytics Worker)
 *   REQUIRE_CLIENT_CERT  = false by default. Set true only if EVERY visitor must have
 *                          a valid Cloudflare mTLS client certificate.
 *
 * When a valid mTLS certificate is presented, its serial is checked against the
 * server-side block list. The serial is also forwarded to /visit so the journal
 * can associate a visit with that certificate.
 */

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      ...extra
    }
  });
}

function tlsInfo(request) {
  const tls = request.cf && request.cf.tlsClientAuth ? request.cf.tlsClientAuth : {};
  const verified = tls.certVerified === 'SUCCESS' || tls.certVerify === 'SUCCESS';
  const serial = String(tls.certSerial || '').trim().toUpperCase();
  return {
    presented: tls.certPresented === '1',
    verified,
    serial: /^[A-F0-9]{1,128}$/.test(serial) ? serial : ''
  };
}

async function isBlocked(serial, env) {
  if (!serial) return false;
  if (!env.ANALYTICS_WORKER_URL || !env.EDGE_SHARED_SECRET) return false;
  const url = new URL('/api/edge-check', env.ANALYTICS_WORKER_URL);
  url.searchParams.set('serial', serial);
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'X-PMT-Edge-Secret': env.EDGE_SHARED_SECRET },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data && data.blocked === true;
  } catch {
    // Fail open so a temporary analytics outage does not take down the public site.
    return false;
  }
}

async function forwardVisit(request, env, tls) {
  const target = new URL('/visit', env.ANALYTICS_WORKER_URL);
  const headers = new Headers(request.headers);
  headers.set('X-PMT-Edge-Source', 'cloudflare-edge');
  if (tls.serial) headers.set('X-PMT-Client-Cert-Serial', tls.serial);
  return fetch(new Request(target.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual'
  }));
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).protocol !== 'https:') {
      return json({ error: 'https-required' }, 400);
    }

    const tls = tlsInfo(request);
    const requireCert = String(env.REQUIRE_CLIENT_CERT || 'false').toLowerCase() === 'true';

    if (requireCert && !tls.verified) {
      return new Response('Требуется действительный клиентский сертификат.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    if (tls.verified && tls.serial && await isBlocked(tls.serial, env)) {
      return new Response('Доступ к этому устройству заблокирован.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    const path = new URL(request.url).pathname;
    if (path === '/visit') {
      if (!env.ANALYTICS_WORKER_URL) return json({ error: 'analytics-worker-not-configured' }, 503);
      return forwardVisit(request, env, tls);
    }

    // The hostname remains backed by GitHub Pages. Because this is a Worker Route,
    // fetch(request) continues the request to the configured origin.
    return fetch(request);
  }
};
