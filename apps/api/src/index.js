const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const env = require('./lib/env');

const dashboardRoutes = require('./routes/dashboard.routes');
const childrenRoutes = require('./routes/children.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const vaccinationsRoutes = require('./routes/vaccinations.routes');
const visitsRoutes = require('./routes/visits.routes');
const paymentsRoutes = require('./routes/payments.routes');

const app = express();

app.use(helmet());
app.use(cors({
    origin: [
        'https://childcare-clinic-app.netlify.app',
        'http://localhost:3000',
        'http://127.0.0.1:5500'
    ],
    credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/vaccinations', vaccinationsRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/payments', paymentsRoutes);

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});

