// Vercel API function for health check
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    vercel: true,
    endpoint: '/health'
  });
}
