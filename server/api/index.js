export default async function handler(req, res) {
  try {
    let app, connectDB, env;
    try {
      ({ app } = await import('../dist/app.js'));
      ({ connectDB } = await import('../dist/config/db.js'));
      ({ env } = await import('../dist/config/env.js'));
    } catch {
      ({ app } = await import('../src/app.js'));
      ({ connectDB } = await import('../src/config/db.js'));
      ({ env } = await import('../src/config/env.js'));
    }

    // Connect to database in background so health check responds immediately
    connectDB().catch((err) => console.error('MongoDB async connection error:', err));

    return app(req, res);
  } catch (error) {
    console.error('Serverless error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
}
