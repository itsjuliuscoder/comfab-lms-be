// Simple hello world API function for Vercel
export default function handler(req, res) {
  res.status(200).json({
    message: 'Hello from Vercel!',
    timestamp: new Date().toISOString(),
    vercel: true,
    status: 'working'
  });
}
