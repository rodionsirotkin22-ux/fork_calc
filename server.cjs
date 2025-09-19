const express = require('express');
const promBundle = require('express-prom-bundle');
const path = require('path');

# Создание экземпляра
const app = express();

# Middleware для сбора метрик
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  promClient: {
    collectDefaultMetrics: {},
  },
});

# Добавление в цепочку запросов
app.use(metricsMiddleware);

# Раздача статических файлов из out через модуль
app.use(express.static(path.join(__dirname, 'out')));

# Перехват get, возврат index, отправка клиенту
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'out', 'index.html'));
});

# Определяет порт прослушки
const PORT = process.env.PORT || 3000;

# Запуск express на порту и вывод сообщений
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Метрики доступны по: http://localhost:${PORT}/metrics`);
});
