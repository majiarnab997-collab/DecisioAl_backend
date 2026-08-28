import { z } from 'zod';

const valueCoercion = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  });

const alternativeSchema = z.object({
  id: z.string().optional().default(() => `alt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`),
  name: z.string().min(1, 'Alternative name is required').trim(),
  description: z.string().optional().default(''),
  values: z.record(z.string(), valueCoercion).optional().default({}),
});

const criterionSchema = z.object({
  id: z.string().optional().default(() => `crit_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`),
  name: z.string().min(1, 'Criterion name is required').trim(),
  description: z.string().optional().default(''),
  weight: z
    .union([z.number(), z.string()])
    .transform((w) => Number(w || 0))
    .pipe(z.number().min(0).max(100))
    .default(10),
  direction: z
    .enum(['higher', 'lower'])
    .optional()
    .default('higher'),
});

export const createDecisionSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(300, 'Title too long').trim(),
    description: z.string().optional().default(''),
    category: z.string().optional().default('General'),
    objective: z.string().optional().default('Evaluate and rank alternatives based on structured multi-criteria decision metrics.'),
    alternatives: z
      .array(alternativeSchema)
      .min(2, 'Please provide at least 2 alternatives')
      .max(50, 'A maximum of 50 alternatives is supported'),
    criteria: z
      .array(criterionSchema)
      .min(1, 'Please provide at least 1 criterion')
      .max(30, 'A maximum of 30 criteria is supported'),
  })
  .transform((data) => {
    // Auto-normalize criteria weights to ensure they sum to 100%
    const total = data.criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
    if (total <= 0) {
      const equalWeight = Math.floor(100 / data.criteria.length);
      let running = 0;
      data.criteria = data.criteria.map((c, i) => {
        if (i === data.criteria.length - 1) {
          return { ...c, weight: Math.max(0, 100 - running) };
        }
        running += equalWeight;
        return { ...c, weight: equalWeight };
      });
    } else if (Math.abs(total - 100) > 0.01) {
      let running = 0;
      data.criteria = data.criteria.map((c, i) => {
        if (i === data.criteria.length - 1) {
          return { ...c, weight: Math.max(0, 100 - running) };
        }
        const normalized = Math.round((c.weight / total) * 100);
        running += normalized;
        return { ...c, weight: normalized };
      });
    }
    return data;
  });

export const updateDecisionSchema = z
  .object({
    title: z.string().min(1).max(300).trim().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    objective: z.string().optional(),
    alternatives: z.array(alternativeSchema).min(2).max(50).optional(),
    criteria: z.array(criterionSchema).min(1).max(30).optional(),
  })
  .transform((data) => {
    if (data.criteria && data.criteria.length > 0) {
      const total = data.criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
      if (total > 0 && Math.abs(total - 100) > 0.01) {
        let running = 0;
        data.criteria = data.criteria.map((c, i) => {
          if (i === data.criteria.length - 1) {
            return { ...c, weight: Math.max(0, 100 - running) };
          }
          const normalized = Math.round((c.weight / total) * 100);
          running += normalized;
          return { ...c, weight: normalized };
        });
      }
    }
    return data;
  });

export const whatIfSchema = z
  .object({
    weights: z.record(z.string(), z.union([z.number(), z.string()]).transform((w) => Number(w || 0))),
  })
  .transform((data) => {
    const total = Object.values(data.weights).reduce((sum, w) => sum + Number(w || 0), 0);
    if (total > 0 && Math.abs(total - 100) > 0.01) {
      const keys = Object.keys(data.weights);
      let running = 0;
      keys.forEach((k, i) => {
        if (i === keys.length - 1) {
          data.weights[k] = Math.max(0, 100 - running);
        } else {
          const norm = Math.round((data.weights[k] / total) * 100);
          running += norm;
          data.weights[k] = norm;
        }
      });
    }
    return data;
  });

export default {
  createDecisionSchema,
  updateDecisionSchema,
  whatIfSchema,
};
