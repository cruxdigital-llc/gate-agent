/**
 * JSON reporter - outputs results to a JSON file
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import type { QualityGatesReport } from '../types.js';

export class JSONReporter {
  async report(report: QualityGatesReport, outputDir: string, projectRoot: string): Promise<void> {
    const outputPath = resolve(projectRoot, outputDir, 'gate-agent-report.json');

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    // Write JSON report
    const jsonContent = JSON.stringify(report, null, 2);
    await writeFile(outputPath, jsonContent, 'utf-8');

    console.log(`JSON report written to: ${outputPath}`);
  }
}
