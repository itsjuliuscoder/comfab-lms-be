// Main API function for Vercel - handles all routes
export default function handler(req, res) {
  const { pathname } = new URL(req.url, `https://${req.headers.host}`);
  
  // Handle different endpoints
  switch (pathname) {
    case '/':
    case '/api':
    case '/api/v1':
      return res.status(200).json({
        message: 'CONFAB LMS API is working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        endpoints: [
          '/health',
          '/test',
          '/api/users/bulk-invite-template'
        ]
      });
      
    case '/health':
      return res.status(200).json({
        ok: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'production',
        vercel: true,
        endpoint: '/health'
      });
      
    case '/test':
      return res.status(200).json({
        ok: true,
        message: 'Test API endpoint working!',
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
      });
      
    default:
      return res.status(404).json({
        ok: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: `Endpoint ${pathname} not found`,
          availableEndpoints: [
            '/',
            '/health',
            '/test',
            '/api/users/bulk-invite-template'
          ]
        }
      });
  }
}
