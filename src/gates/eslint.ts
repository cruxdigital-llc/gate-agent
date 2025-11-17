/**
 * ESLint quality gate
 */

import { resolve } from 'node:path';
import type { GateRunner, GateRunnerContext, GateResult } from '../types.js';
import { runCommand, fileExists, parseJSON } from '../utils/command.js';

interface ESLintResult {
  filePath: string;
  messages: Array<{
    ruleId: string | null;
    severity: number;
    message: string;
    line: number;
    column: number;
  }>;
  errorCount: number;
  warningCount: number;
}

export const eslintGate: GateRunner = {
  name: 'ESLint',

  enabled(context: GateRunnerContext): boolean {
    return context.config.gates.eslint.enabled;
  },

  async run(context: GateRunnerContext): Promise<GateResult> {
    const { projectRoot, config } = context;
    const gateConfig = config.gates.eslint;

    // Check if ESLint config exists
    const configFiles = [
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.cjs',
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      '.eslintrc.json',
      '.eslintrc',
    ];

    const hasConfig = await Promise.any(
      configFiles.map(async (file) => {
        const exists = await fileExists(resolve(projectRoot, file));
        return exists ? file : Promise.reject();
      })
    ).catch(() => null);

    if (!hasConfig) {
      return {
        name: this.name,
        status: 'skipped',
        message: 'No ESLint configuration found',
        duration: 0,
      };
    }

    // Run ESLint with JSON output
    const args = ['eslint', '.', '--format', 'json'];

    // Only add --max-warnings if it's not -1 (unlimited)
    if (gateConfig.maxWarnings >= 0) {
      args.push('--max-warnings', String(gateConfig.maxWarnings));
    }

    const result = await runCommand('npx', args, {
      cwd: projectRoot,
      reject: false,
    });

    // Parse ESLint JSON output
    const eslintResults = parseJSON<ESLintResult[]>(result.stdout);

    if (!eslintResults) {
      // If JSON parsing failed but command succeeded, ESLint might not be installed
      if (result.exitCode === 0) {
        return {
          name: this.name,
          status: 'skipped',
          message: 'ESLint not installed',
          duration: 0,
        };
      }

      return {
        name: this.name,
        status: 'error',
        message: 'Failed to parse ESLint output',
        errors: [result.stderr],
        duration: 0,
      };
    }

    // Calculate totals
    const totalErrors = eslintResults.reduce((sum, file) => sum + file.errorCount, 0);
    const totalWarnings = eslintResults.reduce((sum, file) => sum + file.warningCount, 0);

    // Collect error messages
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const file of eslintResults) {
      for (const msg of file.messages) {
        const message = `${file.filePath}:${msg.line}:${msg.column} - ${msg.message} (${msg.ruleId ?? 'unknown'})`;
        if (msg.severity === 2) {
          errors.push(message);
        } else if (msg.severity === 1) {
          warnings.push(message);
        }
      }
    }

    // Determine status
    const passed = totalErrors <= gateConfig.maxErrors;

    return {
      name: this.name,
      status: passed ? 'passed' : 'failed',
      message: `${totalErrors} error(s), ${totalWarnings} warning(s)`,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      duration: 0,
      details: {
        errorCount: totalErrors,
        warningCount: totalWarnings,
        maxErrors: gateConfig.maxErrors,
        maxWarnings: gateConfig.maxWarnings,
      },
    };
  },
};
