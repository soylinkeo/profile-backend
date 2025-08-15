/* eslint-disable no-console */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDb } = require('./utils/db');

const profileRoutes = require('./routes/profileRoutes');
const { notFound, errorHandler } = require('./utils/errorHandler');

const app = express();

// Accept large JSON (data URLs for images, etc.)
app.use(express.json({ limit: '20mb' }));
app.use(cors());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/profiles', profileRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
connectDb().then(() => {
  app.listen(PORT, () => console.log(`[server] running on http://localhost:${PORT}`));
}).catch((err) => {
  console.error('[server] DB connection failed', err);
  process.exit(1);
});
