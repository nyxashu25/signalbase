import { httpRequestDuration, httpRequestsTotal } from '../config/metrics.js';

/**
 * Records duration/count per request, labeled by route *template*
 * (e.g. "/api/v1/contacts/:id/reveal") rather than the raw URL — using the
 * raw URL would create one time series per contact id and blow up
 * Prometheus's cardinality.
 */
export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const routeTemplate = req.route
      ? `${req.baseUrl}${req.route.path}`
      : `${req.baseUrl || req.path} (unmatched)`;
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const labels = { method: req.method, route: routeTemplate, status_code: res.statusCode };

    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsTotal.inc(labels);
  });

  next();
}
