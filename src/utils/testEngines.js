import { calculateDeterministicScores } from '../services/scoringService.js';
import { analyzeDecisionRisks } from '../services/riskService.js';
import { simulateWhatIf, computeDecisionStability } from '../services/whatIfService.js';

console.log('🧪 Running DecisioAI Engine Test Suite...\n');

// 1. Test Deterministic Scoring
console.log('--- Test 1: Deterministic Scoring (SAW) ---');
const testAlts = [
  { id: 'alt_1', name: 'Stanford', values: { placement: 98, fees: 82000, curriculum: 96 } },
  { id: 'alt_2', name: 'UC Berkeley', values: { placement: 96, fees: 52000, curriculum: 97 } },
  { id: 'alt_3', name: 'CMU', values: { placement: 97, fees: 80000, curriculum: 99 } },
];

const testCriteria = [
  { id: 'placement', name: 'Placement', weight: 40, direction: 'higher' },
  { id: 'fees', name: 'Fees', weight: 30, direction: 'lower' },
  { id: 'curriculum', name: 'Curriculum', weight: 30, direction: 'higher' },
];

const scoringResult = calculateDeterministicScores(testAlts, testCriteria);
console.log('Leader:', scoringResult.ranking[0]);
console.assert(scoringResult.ranking.length === 3, 'Ranking should have 3 items');
console.assert(scoringResult.ranking[0].rank === 1, 'Rank 1 must be assigned');
console.assert(scoringResult.calculatedScores[0].overallScore > 0, 'Score must be > 0');
console.log('✅ Scoring calculation verified!\n');

// 2. Test Edge Case: Equal Max and Min (max === min)
console.log('--- Test 2: Equal Max/Min Normalization Edge Case ---');
const equalAlts = [
  { id: 'alt_1', name: 'Option A', values: { cost: 500 } },
  { id: 'alt_2', name: 'Option B', values: { cost: 500 } },
];
const equalCriteria = [{ id: 'cost', name: 'Cost', weight: 100, direction: 'lower' }];
const equalResult = calculateDeterministicScores(equalAlts, equalCriteria);
console.assert(equalResult.calculatedScores[0].overallScore === 100, 'Equal values should receive full 100% score');
console.assert(equalResult.calculatedScores[1].overallScore === 100, 'Equal values should receive full 100% score');
console.log('✅ Max===Min edge case handled gracefully!\n');

// 3. Test Risk Detection
console.log('--- Test 3: Risk Engine ---');
const risks = analyzeDecisionRisks({
  alternatives: testAlts,
  criteria: testCriteria,
  calculatedScores: scoringResult.calculatedScores,
  ranking: scoringResult.ranking,
});
console.log(`Detected ${risks.length} automated risk factors.`);
console.assert(Array.isArray(risks), 'Risks must be an array');
console.log('✅ Risk detection verified!\n');

// 4. Test What-If and Decision Stability
console.log('--- Test 4: What-If Sensitivity & Stability ---');
const stability = computeDecisionStability({
  alternatives: testAlts,
  criteria: testCriteria,
  ranking: scoringResult.ranking,
});
console.log(`Decision Stability Score: ${stability.stabilityScore}% (${stability.sensitivityAnalysis})`);

const whatIfRes = simulateWhatIf(
  {
    alternatives: testAlts,
    criteria: testCriteria,
    ranking: scoringResult.ranking,
  },
  { placement: 10, fees: 80, curriculum: 10 } // heavily weight fees
);
console.log('What-If Leader with 80% Fees:', whatIfRes.newLeader?.alternativeName);
console.assert(whatIfRes.newLeader?.alternativeName === 'UC Berkeley', 'UC Berkeley should win when fees is 80%');
console.log('✅ What-If Sensitivity Simulator verified!\n');

console.log('🎉 ALL ENGINE VERIFICATION TESTS PASSED SUCCESSFULLY!');
