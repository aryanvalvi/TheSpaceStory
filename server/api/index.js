export default async function handler(req, res) {
  try {
    let app, connectDB;
    try {
      ({ app } = await import('../dist/app.js'));
      ({ connectDB } = await import('../dist/config/db.js'));
    } catch {
      ({ app } = await import('../src/app.js'));
      ({ connectDB } = await import('../src/config/db.js'));
    }

    // Connect to database for API routes that need it
    if (req.url && !req.url.startsWith('/api/health') && req.method !== 'OPTIONS') {
      await connectDB();
    }

    return app(req, res);
  } catch (error) {
    console.error('Serverless error:', error);
    return res.status(500).json({
      error: {
        code: 'DB_CONNECTION_ERROR',
        message: error.message || 'Database connection failed',
      },
    });
  }
}
