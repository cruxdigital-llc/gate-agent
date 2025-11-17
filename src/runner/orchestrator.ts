/**
 * Gate runner orchestration - manages running all quality gates
 */

import type { GateRunner, GateRunnerContext, GateResult, QualityGatesReport } from '../types.js';

export class GateOrchestrator {
  private runners: GateRunner[] = [];

  /**
   * Register a gate runner
   */
  register(runner: GateRunner): void {
    this.runners.push(runner);
  }

  /**
   * Run all enabled gates and collect results
   */
  async run(context: GateRunnerContext): Promise<QualityGatesReport> {
    const results: GateResult[] = [];
    const startTime = Date.now();

    for (const runner of this.runners) {
      // Check if gate is enabled
      if (!runner.enabled(context)) {
        continue;
      }

      // Run the gate
      const gateStartTime = Date.now();
      try {
        const result = await runner.run(context);
        results.push({
          ...result,
          duration: Date.now() - gateStartTime,
        });

        // Fail fast if enabled
        if (context.config.failFast && result.status === 'failed') {
          break;
        }
      } catch (error) {
        results.push({
          name: runner.name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - gateStartTime,
        });

        // Fail fast on errors
        if (context.config.failFast) {
          break;
        }
      }
    }

    const totalDuration = Date.now() - startTime;

    // Calculate summary
    const summary = {
      total: results.length,
      passed: results.filter((r) => r.status === 'passed').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
      totalDuration,
    };

    const success = summary.failed === 0 && summary.errors === 0;

    return {
      results,
      summary,
      timestamp: new Date().toISOString(),
      success,
    };
  }
}
