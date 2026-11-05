/**
 * Internal mock data generator - generates JSON files for all scenarios
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  generateMockPatients, 
  generateComprehensiveTestDataset,
  generateBreastCancerTestPatients,
  generateLungCancerTestPatients,
  generatePancreaticCancerTestPatients,
  generateDiseaseFreeeSurvivalTestPatients,
  mockDataScenarios
} from '../components/kaplan-meier/mock-data-generator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '../public/mock-data');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

interface ScenarioConfig {
  key: string;
  name: string;
  count: number;
  generator: () => any[];
}

const scenarios: ScenarioConfig[] = [
  { key: 'small', name: 'Small', count: 50, generator: () => mockDataScenarios.small() },
  { key: 'medium', name: 'Medium', count: 150, generator: () => mockDataScenarios.medium() },
  { key: 'large', name: 'Large', count: 300, generator: () => mockDataScenarios.large() },
  { key: 'comprehensive', name: 'Comprehensive', count: 1350, generator: () => mockDataScenarios.comprehensive() },
  { key: 'mamma', name: 'Mamma', count: 100, generator: () => mockDataScenarios.mamma() },
  { key: 'breastCancer', name: 'Breast Cancer', count: 100, generator: () => mockDataScenarios.breastCancer() },
  { key: 'lungCancer', name: 'Lung Cancer', count: 100, generator: () => mockDataScenarios.lungCancer() },
  { key: 'pancreaticCancer', name: 'Pancreatic Cancer', count: 80, generator: () => mockDataScenarios.pancreaticCancer() },
  { key: 'diseaseFreeSurvival', name: 'Disease Free Survival', count: 120, generator: () => mockDataScenarios.diseaseFreeSurvival() }
];

console.log('Generating mock data JSON files...\n');

let generatedCount = 0;

for (const scenario of scenarios) {
  try {
    const startTime = Date.now();
    console.log(`Generating ${scenario.name} (${scenario.count} patients)...`);
    
    const patients = scenario.generator();
    
    const elapsedTime = Date.now() - startTime;
    
    const filePath = path.join(outputDir, `${scenario.key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(patients, null, 2));
    
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`   ${scenario.key}.json (${sizeKB} KB) - generated in ${elapsedTime}ms\n`);
    generatedCount++;
  } catch (error) {
    console.error(`   Error generating ${scenario.key}:`, error instanceof Error ? error.message : error);
  }
}

console.log(`\nGenerated ${generatedCount}/${scenarios.length} mock data files`);
console.log(`Files saved to: ${outputDir}\n`);
