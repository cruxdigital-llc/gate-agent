/**
 * Test Coverage quality gate (supports Jest and Vitest)
 */

import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { GateRunner, GateRunnerContext, GateResult } from '../types.js';
import { runCommand, fileExists, parseJSON } from '../utils/command.js';

interface CoverageSummary {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
}

type TestFramework = 'jest' | 'vitest' | null;

async function detectTestFramework(projectRoot: string): Promise<TestFramework> {
  try {
    const packageJsonPath = resolve(projectRoot, 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = parseJSON<{
      devDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    }>(packageJsonContent);

    if (!packageJson) return null;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (allDeps.vitest) return 'vitest';
    if (allDeps.jest || allDeps['@jest/core']) return 'jest';

    return null;
  } catch {
    return null;
  }
}

export const testCoverageGate: GateRunner = {
  name: 'Test Coverage',

  enabled(context: GateRunnerContext): boolean {
    return context.config.gates.testCoverage.enabled;
  },

  async run(context: GateRunnerContext): Promise<GateResult> {
    const { projectRoot, config } = context;
    const gateConfig = config.gates.testCoverage;

    // Detect test framework
    const framework = await detectTestFramework(projectRoot);

    if (!framework) {
      return {
        name: this.name,
        status: 'skipped',
        message: 'No test framework detected (Jest or Vitest)',
        duration: 0,
      };
    }

    // Run tests with coverage
    const command = framework === 'jest' ? 'jest' : 'vitest';
    const args = framework === 'jest' ? ['--coverage', '--json'] : ['run', '--coverage'];

    const result = await runCommand('npx', [command, ...args], {
      cwd: projectRoot,
      reject: false,
      env: {
        ...process.env,
        CI: 'true', // Ensure coverage is generated
      },
    });

    // Read coverage summary
    const coverageSummaryPath = resolve(projectRoot, 'coverage', 'coverage-summary.json');
    const hasCoverage = await fileExists(coverageSummaryPath);

    if (!hasCoverage) {
      // Tests might have failed or coverage not configured
      if (result.exitCode !== 0) {
        return {
          name: this.name,
          status: 'failed',
          message: 'Tests failed or coverage not generated',
          errors: ['Run tests with coverage enabled'],
          duration: 0,
        };
      }

      return {
        name: this.name,
        status: 'skipped',
        message: 'Coverage not configured',
        duration: 0,
      };
    }

    // Parse coverage summary
    const coverageContent = await readFile(coverageSummaryPath, 'utf-8');
    const coverage = parseJSON<CoverageSummary>(coverageContent);

    if (!coverage) {
      return {
        name: this.name,
        status: 'error',
        message: 'Failed to parse coverage summary',
        duration: 0,
      };
    }

    const { lines, statements, functions, branches } = coverage.total;
    const { threshold } = gateConfig;

    // Check if coverage meets thresholds
    const failures: string[] = [];

    if (lines.pct < threshold.line) {
      failures.push(`Line coverage ${lines.pct.toFixed(2)}% < ${threshold.line}%`);
    }
    if (statements.pct < threshold.statement) {
      failures.push(`Statement coverage ${statements.pct.toFixed(2)}% < ${threshold.statement}%`);
    }
    if (functions.pct < threshold.function) {
      failures.push(`Function coverage ${functions.pct.toFixed(2)}% < ${threshold.function}%`);
    }
    if (branches.pct < threshold.branch) {
      failures.push(`Branch coverage ${branches.pct.toFixed(2)}% < ${threshold.branch}%`);
    }

    const passed = failures.length === 0;

    return {
      name: this.name,
      status: passed ? 'passed' : 'failed',
      message: passed
        ? `All coverage thresholds met (${lines.pct.toFixed(2)}% line coverage)`
        : `${failures.length} coverage threshold(s) not met`,
      errors: failures.length > 0 ? failures : undefined,
      duration: 0,
      details: {
        framework,
        coverage: {
          lines: lines.pct,
          statements: statements.pct,
          functions: functions.pct,
          branches: branches.pct,
        },
        thresholds: threshold,
      },
    };
  },
};
