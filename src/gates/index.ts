/**
 * Quality gates registry
 */

import { eslintGate } from './eslint.js';
import { prettierGate } from './prettier.js';
import { typescriptGate } from './typescript.js';
import { testCoverageGate } from './test-coverage.js';
import { osvScannerGate } from './osv-scanner.js';
import { eslintSecurityGate } from './eslint-security.js';

export const allGates = [
  eslintGate,
  prettierGate,
  typescriptGate,
  testCoverageGate,
  osvScannerGate,
  eslintSecurityGate,
];

export {
  eslintGate,
  prettierGate,
  typescriptGate,
  testCoverageGate,
  osvScannerGate,
  eslintSecurityGate,
};
