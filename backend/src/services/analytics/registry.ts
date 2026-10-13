import { MetricDefinition } from './types';

// Every chart on the analytics screen is one registered metric. Adding a chart means registering a
// definition here (see metrics/index.ts) and placing a slot in the frontend's view config.

const registry = new Map<string, MetricDefinition>();

export const registerMetric = (definition: MetricDefinition): void => {
  if (registry.has(definition.id)) throw new Error(`Duplicate analytics metric id: ${definition.id}`);
  registry.set(definition.id, definition);
};

export const getMetric = (id: string): MetricDefinition | undefined => registry.get(id);

export const listMetricIds = (): string[] => [...registry.keys()];
