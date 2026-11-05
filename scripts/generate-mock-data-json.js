/**
 * Generate mock data JSON files for all scenarios
 * Run this once to create the JSON files, then commit them to the repo
 * 
 * Usage: node scripts/generate-mock-data-json.js
 */

const fs = require('fs');
const path = require('path');

// Import the mock data generator - we'll use dynamic import for ESM
const { execSync } = require('child_process');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../public/mock-data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('📊 Generating mock data JSON files...\n');

// Scenarios to generate
const scenarios = [
  { key: 'small', count: 50 },
  { key: 'medium', count: 150 },
  { key: 'large', count: 300 },
  { key: 'comprehensive', count: 1350 },
  { key: 'mamma', count: 100 },
  { key: 'breastCancer', count: 100 },
  { key: 'lungCancer', count: 100 },
  { key: 'pancreaticCancer', count: 80 },
  { key: 'diseaseFreeSurvival', count: 120 }
];

// We'll use ts-node or tsx to run TypeScript
const tsxPath = path.join(__dirname, '../node_modules/.bin/tsx');

const command = `${tsxPath} ${path.join(__dirname, './generate-mock-data-internal.ts')}`;

try {
  execSync(command, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('\n✅ Mock data JSON files generated successfully!');
  console.log(`📁 Files saved to: ${outputDir}`);
  console.log('\nScenarios generated:');
  scenarios.forEach(s => {
    const filePath = path.join(outputDir, `${s.key}.json`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  ✓ ${s.key}: ${s.count} patients (${sizeKB} KB)`);
    }
  });
} catch (error) {
  console.error('❌ Error generating mock data:', error.message);
  process.exit(1);
}
