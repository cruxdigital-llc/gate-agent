/**
 * OSV-Scanner quality gate for dependency vulnerability scanning
 */

import { resolve } from 'node:path';
import type { GateRunner, GateRunnerContext, GateResult } from '../types.js';
import { runCommand, fileExists, commandExists, parseJSON } from '../utils/command.js';

interface OSVVulnerability {
  id: string;
  summary: string;
  severity?: string;
}

interface OSVResult {
  results?: Array<{
    source: { path: string };
    packages: Array<{
      package: { name: string; version: string };
      vulnerabilities: OSVVulnerability[];
    }>;
  }>;
}

export const osvScannerGate: GateRunner = {
  name: 'OSV Scanner',

  enabled(context: GateRunnerContext): boolean {
    return context.config.gates.osvScanner.enabled;
  },

  async run(context: GateRunnerContext): Promise<GateResult> {
    const { projectRoot } = context;

    // Check if package-lock.json, yarn.lock, or pnpm-lock.yaml exists
    const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
    const hasLockFile = await Promise.any(
      lockFiles.map(async (file) => {
        const exists = await fileExists(resolve(projectRoot, file));
        return exists ? file : Promise.reject();
      })
    ).catch(() => null);

    if (!hasLockFile) {
      return {
        name: this.name,
        status: 'skipped',
        message: 'No lock file found (package-lock.json, yarn.lock, or pnpm-lock.yaml)',
        duration: 0,
      };
    }

    // Check if osv-scanner is installed
    const hasOSVScanner = await commandExists('osv-scanner');

    if (!hasOSVScanner) {
      return {
        name: this.name,
        status: 'skipped',
        message: 'osv-scanner not installed. Install with: go install github.com/google/osv-scanner/cmd/osv-scanner@latest',
        duration: 0,
      };
    }

    // Run osv-scanner with JSON output
    const result = await runCommand('osv-scanner', ['--format', 'json', '--lockfile', hasLockFile], {
      cwd: projectRoot,
      reject: false,
    });

    // OSV-scanner exits with code 0 if no vulnerabilities, 1 if vulnerabilities found
    if (result.exitCode === 0) {
      return {
        name: this.name,
        status: 'passed',
        message: 'No vulnerabilities found',
        duration: 0,
      };
    }

    // Try to parse JSON output
    const osvResult = parseJSON<OSVResult>(result.stdout);

    if (!osvResult || !osvResult.results) {
      // If we can't parse JSON, check if there were vulnerabilities based on exit code
      if (result.exitCode === 1) {
        return {
          name: this.name,
          status: 'failed',
          message: 'Vulnerabilities detected (run osv-scanner locally for details)',
          duration: 0,
        };
      }

      return {
        name: this.name,
        status: 'error',
        message: 'Failed to run osv-scanner',
        errors: [result.stderr || 'Unknown error'],
        duration: 0,
      };
    }

    // Count vulnerabilities
    let totalVulnerabilities = 0;
    const vulnerabilityList: string[] = [];

    for (const scanResult of osvResult.results) {
      for (const pkg of scanResult.packages) {
        for (const vuln of pkg.vulnerabilities) {
          totalVulnerabilities++;
          const severity = vuln.severity ? `[${vuln.severity}]` : '';
          vulnerabilityList.push(
            `${pkg.package.name}@${pkg.package.version}: ${vuln.id} ${severity} - ${vuln.summary}`
          );
        }
      }
    }

    return {
      name: this.name,
      status: 'failed',
      message: `${totalVulnerabilities} vulnerabilit${totalVulnerabilities === 1 ? 'y' : 'ies'} found`,
      errors: vulnerabilityList.slice(0, 10), // Limit to first 10
      duration: 0,
      details: {
        vulnerabilityCount: totalVulnerabilities,
      },
    };
  },
};
