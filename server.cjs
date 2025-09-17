const express = require('express');
const promBundle = require('express-prom-bundle');
const path = require('path');

const app = express();

// Middleware для сбора метрик
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  promClient: {
    collectDefaultMetrics: {},
  },
});

app.use(metricsMiddleware);

// Раздача статики
app.use(express.static(path.join(__dirname, 'out')));

// Fallback на index.html для SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'out', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Метрики доступны по: http://localhost:${PORT}/metrics`);
});
