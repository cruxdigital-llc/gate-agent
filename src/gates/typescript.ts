/**
 * TypeScript compiler quality gate
 */

import { resolve } from 'node:path';
import type { GateRunner, GateRunnerContext, GateResult } from '../types.js';
import { runCommand, fileExists } from '../utils/command.js';

export const typescriptGate: GateRunner = {
  name: 'TypeScript',

  enabled(context: GateRunnerContext): boolean {
    return context.config.gates.typescript.enabled;
  },

  async run(context: GateRunnerContext): Promise<GateResult> {
    const { projectRoot } = context;

    // Check if tsconfig.json exists
    const tsconfigPath = resolve(projectRoot, 'tsconfig.json');
    const hasTsConfig = await fileExists(tsconfigPath);

    if (!hasTsConfig) {
      return {
        name: this.name,
        status: 'skipped',
        message: 'No tsconfig.json found',
        duration: 0,
      };
    }

    // Run TypeScript compiler
    const result = await runCommand('npx', ['tsc', '--noEmit'], {
      cwd: projectRoot,
      reject: false,
    });

    if (result.exitCode === 0) {
      return {
        name: this.name,
        status: 'passed',
        message: 'No type errors found',
        duration: 0,
      };
    }

    // Parse TypeScript errors
    const errorLines = result.stdout
      .split('\n')
      .filter((line) => line.trim() && !line.includes('Found ') && !line.includes('Watching for'));

    // Extract error count from output
    const errorCountMatch = result.stdout.match(/Found (\d+) error/);
    const errorCount = errorCountMatch?.[1] ? parseInt(errorCountMatch[1], 10) : errorLines.length;

    return {
      name: this.name,
      status: 'failed',
      message: `${errorCount} type error(s) found`,
      errors: errorLines.slice(0, 10), // Limit to first 10 errors
      duration: 0,
      details: {
        errorCount,
      },
    };
  },
};
