/**
 * Tests for config schema validation
 */

import { describe, it, expect } from 'vitest';
import { configSchema } from './schema.js';

describe('configSchema', () => {
  it('should validate a valid minimal config', () => {
    const config = {
      gates: {},
      reporting: {},
      failFast: false,
    };

    const result = configSchema.parse(config);

    expect(result).toBeDefined();
    expect(result.gates.eslint.enabled).toBe(true); // Default value
    expect(result.reporting.formats).toEqual(['terminal']); // Default value
  });

  it('should apply defaults for missing fields', () => {
    const config = {};

    const result = configSchema.parse(config);

    expect(result.gates).toBeDefined();
    expect(result.reporting).toBeDefined();
    expect(result.failFast).toBe(false);
  });

  it('should validate ESLint gate config', () => {
    const config = {
      gates: {
        eslint: {
          enabled: false,
          maxErrors: 5,
          maxWarnings: 10,
        },
      },
    };

    const result = configSchema.parse(config);

    expect(result.gates.eslint.enabled).toBe(false);
    expect(result.gates.eslint.maxErrors).toBe(5);
    expect(result.gates.eslint.maxWarnings).toBe(10);
  });

  it('should validate test coverage thresholds', () => {
    const config = {
      gates: {
        testCoverage: {
          enabled: true,
          threshold: {
            line: 90,
            branch: 85,
            function: 80,
            statement: 95,
          },
        },
      },
    };

    const result = configSchema.parse(config);

    expect(result.gates.testCoverage.threshold.line).toBe(90);
    expect(result.gates.testCoverage.threshold.branch).toBe(85);
  });

  it('should reject invalid coverage thresholds', () => {
    const config = {
      gates: {
        testCoverage: {
          threshold: {
            line: 150, // Invalid: > 100
          },
        },
      },
    };

    expect(() => configSchema.parse(config)).toThrow();
  });

  it('should validate reporting formats', () => {
    const config = {
      reporting: {
        formats: ['terminal', 'json', 'html'],
      },
    };

    const result = configSchema.parse(config);

    expect(result.reporting.formats).toEqual(['terminal', 'json', 'html']);
  });

  it('should reject invalid reporting formats', () => {
    const config = {
      reporting: {
        formats: ['invalid'],
      },
    };

    expect(() => configSchema.parse(config)).toThrow();
  });
});
