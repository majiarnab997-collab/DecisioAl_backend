import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { env } from './config/env.js';
import { connectDB } from '../../database/config/database.js';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// High Performance Gzip/Brotli Compression
app.use(compression());

// Middleware: Request Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Middleware: CORS Configuration
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app') || origin.endsWith('.render.com')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev, configurable in prod
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Middleware: JSON and URL Encoded Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to DecisioAI API — Decision Intelligence Platform',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// API Routes
app.use('/api', apiRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Server startup function
const startServer = async () => {
  try {
    // Initialize Database Layer (Supabase / MongoDB / Local Store)
    await connectDB();

    const PORT = env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 DecisioAI Server running in [${env.NODE_ENV}] mode on port ${PORT}`);
      console.log(`📡 Health check available at: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error(`❌ Failed to start DecisioAI server: ${error.message}`);
    // Start server anyway so API diagnostics can report status
    const PORT = env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 DecisioAI Server running in fallback mode on port ${PORT}`);
    });
  }
};

startServer();

export default app;
