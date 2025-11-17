/**
 * Prettier quality gate
 */

import { resolve } from 'node:path';
import type { GateRunner, GateRunnerContext, GateResult } from '../types.js';
import { runCommand, fileExists } from '../utils/command.js';

export const prettierGate: GateRunner = {
  name: 'Prettier',

  enabled(context: GateRunnerContext): boolean {
    return context.config.gates.prettier.enabled;
  },

  async run(context: GateRunnerContext): Promise<GateResult> {
    const { projectRoot } = context;

    // Check if Prettier config exists
    const configFiles = [
      '.prettierrc',
      '.prettierrc.json',
      '.prettierrc.yml',
      '.prettierrc.yaml',
      '.prettierrc.json5',
      '.prettierrc.js',
      '.prettierrc.cjs',
      '.prettierrc.mjs',
      'prettier.config.js',
      'prettier.config.cjs',
      'prettier.config.mjs',
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
        message: 'No Prettier configuration found',
        duration: 0,
      };
    }

    // Run Prettier check
    const result = await runCommand('npx', ['prettier', '--check', '.', '--ignore-unknown'], {
      cwd: projectRoot,
      reject: false,
    });

    if (result.exitCode === 0) {
      return {
        name: this.name,
        status: 'passed',
        message: 'All files are formatted correctly',
        duration: 0,
      };
    }

    // Parse output to get unformatted files
    const lines = result.stdout.split('\n').filter((line) => line.trim());
    const unformattedFiles: string[] = [];

    for (const line of lines) {
      // Prettier outputs [warn] lines for unformatted files
      if (line.includes('[warn]')) {
        // Extract filename after [warn]
        const filename = line.replace('[warn]', '').trim();
        if (filename && !filename.includes('Code style issues')) {
          unformattedFiles.push(filename);
        }
      }
    }

    return {
      name: this.name,
      status: 'failed',
      message: `${unformattedFiles.length} file(s) not formatted`,
      errors: unformattedFiles.slice(0, 10), // Limit to first 10 files
      duration: 0,
      details: {
        unformattedCount: unformattedFiles.length,
      },
    };
  },
};
