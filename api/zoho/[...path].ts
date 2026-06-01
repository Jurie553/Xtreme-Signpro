const API_UNAVAILABLE_MESSAGE =
  'This API endpoint is not available on this deployment. Zoho backend routes may need Cloud Run or Vercel serverless functions.';

export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(503).json({
    success: false,
    overallReady: false,
    backendAvailable: false,
    deployment: 'vercel-frontend-fallback',
    path: `/api/zoho/${Array.isArray(req.query?.path) ? req.query.path.join('/') : req.query?.path || ''}`,
    method: req.method,
    error: API_UNAVAILABLE_MESSAGE,
    message: API_UNAVAILABLE_MESSAGE
  });
}
