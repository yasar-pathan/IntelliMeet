const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const Sentry = require('@sentry/node');
const morganMiddleware = require('./middleware/logger.middleware');
const { globalLimiter } = require('./middleware/rateLimiter.middleware');
const masterRouter = require('./routes/index');
const errorMiddleware = require('./middleware/error.middleware');
const ApiError = require('./utils/ApiError');
const logger = require('./utils/logger');

// Initialize Sentry in production if DSN is set
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 1.0
  });
  logger.info('Sentry initialized successfully');
}

const app = express();

// Trust proxy if backend is behind a reverse proxy (Nginx, Cloudflare, Load Balancers, etc.)
// Defaults to trusting the first proxy ('1'), which is standard for deployments.
const trustProxy = process.env.TRUST_PROXY || '1';
if (trustProxy === 'true') {
  app.set('trust proxy', true);
} else if (trustProxy === 'false') {
  app.set('trust proxy', false);
} else if (!isNaN(Number(trustProxy))) {
  app.set('trust proxy', Number(trustProxy));
} else {
  app.set('trust proxy', trustProxy);
}


// 1. Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com'],
      connectSrc: ["'self'", 'wss:', 'ws:', 'https://api.sentry.io']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// 2. CORS configuration matching ALLOWED_ORIGINS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
    'http://localhost:5173',
    'https://founderlabs.app',
    'https://www.founderlabs.app'
  ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Cookie parser for JWT httpOnly cookies
app.use(cookieParser());

// 5. Gzip response compression
app.use(compression());

// 6. Request logging
app.use(morganMiddleware);

// 7. Rate limiters
app.use(globalLimiter);

// 8. NoSQL injection sanitization
app.use(mongoSanitize());

// 9. Input XSS cleaning middleware
const sanitizeInputObject = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = xss(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeInputObject(obj[key]);
    }
  }
};

app.use((req, res, next) => {
  if (req.body) sanitizeInputObject(req.body);
  if (req.query) sanitizeInputObject(req.query);
  if (req.params) sanitizeInputObject(req.params);
  next();
});

// 10. Mount master API router
app.use('/api/v1', masterRouter);

// 11. 404 Route handler
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// 12. Global error handling middleware (must be last)
app.use(errorMiddleware);

module.exports = app;
