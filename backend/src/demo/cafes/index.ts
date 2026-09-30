import { loamline } from './loamline';
import { chiguru } from './chiguru';
import { crumbwell } from './crumbwell';
import { DemoCafe } from './types';

export type { DemoCafe, DemoMenuCategory, DemoMenuItem } from './types';

// The demo cafés, in the order a tick works through them.
export const DEMO_CAFES: DemoCafe[] = [loamline, chiguru, crumbwell];
