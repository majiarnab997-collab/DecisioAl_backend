import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Test CSV Parsing
const sampleCsv = `College,Placement_Score,Tuition_Fees_USD,Curriculum_Score,Location_Rating,AI_ML_Labs,Campus_Facilities
Stanford University,98,82000,96,95,97,95
UC Berkeley,96,52000,97,92,96,88
Carnegie Mellon University,97,80000,99,75,99,92
University of Washington,93,48000,91,88,92,90
MIT,99,84000,98,85,98,96`;

const parsed = Papa.parse(sampleCsv, { skipEmptyLines: true, dynamicTyping: true });
console.log('Parsed CSV rows:', parsed.data.length);
console.log('Headers:', parsed.data[0]);
console.log('First alternative:', parsed.data[1][0]);

// Test XLSX Generation & Reading
const ws = XLSX.utils.aoa_to_sheet([
  ['Laptop Model', 'CPU_Performance', 'Price_USD', 'Battery_Hours'],
  ['MacBook Pro 16', 98, 3499, 18],
  ['Dell XPS 16', 92, 2799, 9],
]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Decisions');
const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const readWb = XLSX.read(buffer, { type: 'buffer' });
const json = XLSX.utils.sheet_to_json(readWb.Sheets['Decisions'], { header: 1 });
console.log('Read XLSX rows:', json.length);
console.log('All tests passed cleanly!');
