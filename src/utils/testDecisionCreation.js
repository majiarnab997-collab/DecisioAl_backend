import { createDecisionSchema } from '../validators/decisionValidator.js';

// Test 1: String numbers, 12 alternatives, weights summing to 99%
const testPayload = {
  title: 'Spreadsheet Upload Test',
  category: 'Technology',
  objective: 'Test auto-coercion and weight balancing',
  alternatives: [
    { id: 'a1', name: 'MacBook Pro', values: { cost: '$3,499', rating: '98%' } },
    { id: 'a2', name: 'Dell XPS', values: { cost: '$2,799', rating: '92' } },
    { id: 'a3', name: 'ThinkPad P1', values: { cost: '$2,499', rating: '90' } },
    { id: 'a4', name: 'ROG Zephyrus', values: { cost: '2299', rating: 95 } },
    { id: 'a5', name: 'Framework 16', values: { cost: '1999', rating: 86 } },
    { id: 'a6', name: 'Razer Blade 16', values: { cost: '3299', rating: 94 } },
    { id: 'a7', name: 'HP Omen Transcend', values: { cost: '2199', rating: 89 } },
    { id: 'a8', name: 'Lenovo Legion 9i', values: { cost: '3799', rating: 96 } },
    { id: 'a9', name: 'MSI Stealth 16', values: { cost: '2399', rating: 88 } },
    { id: 'a10', name: 'Acer Predator Helios', values: { cost: '1899', rating: 85 } },
    { id: 'a11', name: 'Gigabyte Aorus 16', values: { cost: '2099', rating: 87 } },
    { id: 'a12', name: 'Alienware m16', values: { cost: '2699', rating: 91 } },
  ],
  criteria: [
    { id: 'cost', name: 'Price USD', weight: 49, direction: 'lower' },
    { id: 'rating', name: 'Performance Rating', weight: 50, direction: 'higher' },
  ],
};

try {
  const validated = createDecisionSchema.parse(testPayload);
  console.log('✅ Validation passed successfully!');
  console.log('Alternatives count:', validated.alternatives.length);
  console.log('First alt values:', validated.alternatives[0].values);
  console.log('Criteria weights normalized:', validated.criteria.map((c) => `${c.name}: ${c.weight}%`));
  const totalWeight = validated.criteria.reduce((s, c) => s + c.weight, 0);
  console.log('Total weight sum:', totalWeight);
} catch (err) {
  console.error('❌ Validation failed:', err);
}
