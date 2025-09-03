import express from 'express';
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    vercel: true
  });
});

// Test endpoint
app.get("/test", (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Test API endpoint working!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
});

// Main API endpoint
app.get("/", (req, res) => {
  res.json({
    message: 'CONFAB LMS API is working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/health',
      '/test',
      '/api/users/bulk-invite-template'
    ]
  });
});

// Bulk invite template endpoint
app.get("/api/users/bulk-invite-template", (req, res) => {
  try {
    // For now, return a simple response
    // TODO: Implement Excel template generation
    res.status(200).json({
      ok: true,
      message: 'Bulk invite template endpoint working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: {
        code: 'TEMPLATE_GENERATION_ERROR',
        message: 'Failed to generate template'
      }
    });
  }
});

// Start server (only for local development)
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log("Server ready on port 3000."));
}

export default app;
