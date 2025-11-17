/**
 * Tests for gate orchestrator
 */

import { describe, it, expect } from 'vitest';
import { GateOrchestrator } from './orchestrator.js';
import type { GateRunner, GateRunnerContext } from '../types.js';

// Mock gates for testing
const mockPassingGate: GateRunner = {
  name: 'MockPassing',
  enabled: () => true,
  run: async () => ({
    name: 'MockPassing',
    status: 'passed',
    message: 'All good',
    duration: 100,
  }),
};

const mockFailingGate: GateRunner = {
  name: 'MockFailing',
  enabled: () => true,
  run: async () => ({
    name: 'MockFailing',
    status: 'failed',
    message: 'Failed',
    errors: ['Error 1', 'Error 2'],
    duration: 200,
  }),
};

const mockSkippedGate: GateRunner = {
  name: 'MockSkipped',
  enabled: () => false,
  run: async () => ({
    name: 'MockSkipped',
    status: 'skipped',
    message: 'Not enabled',
    duration: 0,
  }),
};

const mockErrorGate: GateRunner = {
  name: 'MockError',
  enabled: () => true,
  run: async () => {
    throw new Error('Something went wrong');
  },
};

const createMockContext = (): GateRunnerContext => ({
  projectRoot: '/test/project',
  config: {
    gates: {
      eslint: { enabled: true, maxErrors: 0, maxWarnings: -1 },
      prettier: { enabled: true },
      typescript: { enabled: true, strict: true },
      testCoverage: {
        enabled: true,
        threshold: { line: 80, branch: 80, function: 80, statement: 80 },
      },
      osvScanner: { enabled: true },
      eslintSecurity: { enabled: true },
    },
    reporting: {
      formats: ['terminal'],
      outputDir: '.quality-gates',
    },
    failFast: false,
  },
});

describe('GateOrchestrator', () => {
  it('should run all enabled gates', async () => {
    const orchestrator = new GateOrchestrator();
    orchestrator.register(mockPassingGate);
    orchestrator.register(mockFailingGate);
    orchestrator.register(mockSkippedGate);

    const context = createMockContext();
    const report = await orchestrator.run(context);

    // Should only run enabled gates
    expect(report.results).toHaveLength(2); // Passing and Failing, not Skipped
    expect(report.summary.total).toBe(2);
    expect(report.summary.passed).toBe(1);
    expect(report.summary.failed).toBe(1);
    expect(report.summary.skipped).toBe(0);
    expect(report.success).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    const orchestrator = new GateOrchestrator();
    orchestrator.register(mockErrorGate);

    const context = createMockContext();
    const report = await orchestrator.run(context);

    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.status).toBe('error');
    expect(report.results[0]?.message).toContain('Something went wrong');
    expect(report.summary.errors).toBe(1);
    expect(report.success).toBe(false);
  });

  it('should fail fast when enabled', async () => {
    const orchestrator = new GateOrchestrator();
    orchestrator.register(mockFailingGate);
    orchestrator.register(mockPassingGate); // Should not run due to fail fast

    const context = createMockContext();
    context.config.failFast = true;

    const report = await orchestrator.run(context);

    expect(report.results).toHaveLength(1); // Only failing gate should run
    expect(report.results[0]?.name).toBe('MockFailing');
    expect(report.success).toBe(false);
  });

  it('should report success when all gates pass', async () => {
    const orchestrator = new GateOrchestrator();
    orchestrator.register(mockPassingGate);

    const context = createMockContext();
    const report = await orchestrator.run(context);

    expect(report.success).toBe(true);
    expect(report.summary.passed).toBe(1);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.errors).toBe(0);
  });

  it('should include timestamp in report', async () => {
    const orchestrator = new GateOrchestrator();
    orchestrator.register(mockPassingGate);

    const context = createMockContext();
    const report = await orchestrator.run(context);

    expect(report.timestamp).toBeDefined();
    expect(new Date(report.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('should calculate total duration', async () => {
    const orchestrator = new GateOrchestrator();
    orchestrator.register(mockPassingGate);
    orchestrator.register(mockFailingGate);

    const context = createMockContext();
    const report = await orchestrator.run(context);

    expect(report.summary.totalDuration).toBeGreaterThanOrEqual(0);
  });
});
