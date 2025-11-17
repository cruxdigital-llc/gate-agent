/**
 * ESLint Security quality gate (checks for security vulnerabilities using ESLint plugins)
 */

import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
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

async function hasSecurityPlugin(projectRoot: string): Promise<boolean> {
  try {
    const packageJsonPath = resolve(projectRoot, 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = parseJSON<{
      devDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    }>(packageJsonContent);

    if (!packageJson) return false;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for common security plugins
    return Boolean(
      allDeps['eslint-plugin-security'] ||
        allDeps['@eslint-community/eslint-plugin-security'] ||
        allDeps['eslint-plugin-no-secrets'] ||
        allDeps['eslint-plugin-xss']
    );
  } catch {
    return false;
  }
}

export const eslintSecurityGate: GateRunner = {
  name: 'ESLint Security',

  enabled(context: GateRunnerContext): boolean {
    return context.config.gates.eslintSecurity.enabled;
  },

  async run(context: GateRunnerContext): Promise<GateResult> {
    const { projectRoot } = context;

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

    // Check if security plugin is installed
    const hasPlugin = await hasSecurityPlugin(projectRoot);

    if (!hasPlugin) {
      return {
        name: this.name,
        status: 'skipped',
        message: 'No ESLint security plugin installed (try: eslint-plugin-security)',
        duration: 0,
      };
    }

    // Run ESLint with security rules filter
    // We'll run ESLint and filter for security-related rules
    const result = await runCommand('npx', ['eslint', '.', '--format', 'json'], {
      cwd: projectRoot,
      reject: false,
    });

    // Parse ESLint JSON output
    const eslintResults = parseJSON<ESLintResult[]>(result.stdout);

    if (!eslintResults) {
      return {
        name: this.name,
        status: 'error',
        message: 'Failed to parse ESLint output',
        errors: [result.stderr],
        duration: 0,
      };
    }

    // Filter for security-related issues (rules from security plugins)
    const securityRulePrefixes = ['security/', 'no-secrets/', 'xss/'];
    const securityIssues: string[] = [];
    let securityErrorCount = 0;

    for (const file of eslintResults) {
      for (const msg of file.messages) {
        const ruleId = msg.ruleId || '';
        const isSecurityRule = securityRulePrefixes.some((prefix) => ruleId.startsWith(prefix));

        if (isSecurityRule && msg.severity === 2) {
          securityErrorCount++;
          securityIssues.push(
            `${file.filePath}:${msg.line}:${msg.column} - ${msg.message} (${ruleId})`
          );
        }
      }
    }

    if (securityErrorCount === 0) {
      return {
        name: this.name,
        status: 'passed',
        message: 'No security issues found',
        duration: 0,
      };
    }

    return {
      name: this.name,
      status: 'failed',
      message: `${securityErrorCount} security issue(s) found`,
      errors: securityIssues.slice(0, 10), // Limit to first 10
      duration: 0,
      details: {
        securityErrorCount,
      },
    };
  },
};
