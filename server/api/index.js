import { app } from '../dist/app.js';
import { connectDB } from '../dist/config/db.js';

export default async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
}
