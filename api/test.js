// Simple test API endpoint
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: 'Test API endpoint working!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
}
