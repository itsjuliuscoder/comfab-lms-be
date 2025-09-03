// Simple API function for Vercel
export default function handler(req, res) {
  res.status(200).json({
    message: 'CONFAB LMS API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    working: true
  });
}
