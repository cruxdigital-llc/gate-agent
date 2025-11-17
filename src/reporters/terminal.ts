/**
 * Terminal reporter with colorized output
 */

import chalk from 'chalk';
import type { QualityGatesReport, GateResult } from '../types.js';

function getStatusSymbol(status: GateResult['status']): string {
  switch (status) {
    case 'passed':
      return chalk.green('✓');
    case 'failed':
      return chalk.red('✗');
    case 'skipped':
      return chalk.yellow('○');
    case 'error':
      return chalk.red('!');
  }
}

function getStatusColor(status: GateResult['status']): (text: string) => string {
  switch (status) {
    case 'passed':
      return chalk.green;
    case 'failed':
      return chalk.red;
    case 'skipped':
      return chalk.yellow;
    case 'error':
      return chalk.red;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export class TerminalReporter {
  report(report: QualityGatesReport): void {
    console.log('\n' + chalk.bold('Quality Gates Report'));
    console.log(chalk.gray('─'.repeat(80)) + '\n');

    // Print each gate result
    for (const result of report.results) {
      const symbol = getStatusSymbol(result.status);
      const statusColor = getStatusColor(result.status);
      const statusText = statusColor(result.status.toUpperCase());

      console.log(`${symbol} ${chalk.bold(result.name)} - ${statusText}`);

      if (result.message) {
        console.log(`  ${chalk.gray(result.message)}`);
      }

      // Print errors
      if (result.errors && result.errors.length > 0) {
        console.log(chalk.red('  Errors:'));
        for (const error of result.errors) {
          console.log(chalk.red(`    • ${error}`));
        }
      }

      // Print warnings
      if (result.warnings && result.warnings.length > 0) {
        console.log(chalk.yellow('  Warnings:'));
        for (const warning of result.warnings) {
          console.log(chalk.yellow(`    • ${warning}`));
        }
      }

      // Print details if available
      if (result.details && Object.keys(result.details).length > 0) {
        const detailsStr = JSON.stringify(result.details, null, 2)
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n');
        console.log(chalk.gray('  Details:'));
        console.log(chalk.gray(detailsStr));
      }

      console.log('');
    }

    // Print summary
    console.log(chalk.gray('─'.repeat(80)));
    console.log(chalk.bold('\nSummary:'));
    console.log(`  Total gates: ${report.summary.total}`);
    console.log(`  ${chalk.green('Passed')}: ${report.summary.passed}`);
    console.log(`  ${chalk.red('Failed')}: ${report.summary.failed}`);
    console.log(`  ${chalk.yellow('Skipped')}: ${report.summary.skipped}`);
    console.log(`  ${chalk.red('Errors')}: ${report.summary.errors}`);
    console.log(`  Duration: ${formatDuration(report.summary.totalDuration)}`);

    console.log('');

    if (report.success) {
      console.log(chalk.green.bold('✓ All quality gates passed!'));
    } else {
      console.log(chalk.red.bold('✗ Quality gates failed'));
    }

    console.log('');
  }
}
