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

    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error('Serverless error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
}
