import { registerMetric } from '../registry';
import { customerMetrics } from './customers';
import { kitchenMetrics } from './kitchen';
import { menuMetrics } from './menu';
import { moneyMetrics } from './money';
import { overviewMetrics } from './overview';
import { overviewChartMetrics } from './overviewCharts';

// The built-in metric catalogue. Importing this file registers every metric (service.ts does).
[...overviewMetrics, ...overviewChartMetrics, ...menuMetrics, ...customerMetrics, ...kitchenMetrics, ...moneyMetrics].forEach(registerMetric);
