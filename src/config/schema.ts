/**
 * Zod schemas for validating quality-gates.yml configuration
 */

import { z } from 'zod';

const eslintGateSchema = z.object({
  enabled: z.boolean().default(true),
  maxErrors: z.number().int().nonnegative().default(0),
  maxWarnings: z.number().int().default(-1),
});

const prettierGateSchema = z.object({
  enabled: z.boolean().default(true),
});

const typescriptGateSchema = z.object({
  enabled: z.boolean().default(true),
  strict: z.boolean().default(true),
});

const testCoverageGateSchema = z.object({
  enabled: z.boolean().default(true),
  threshold: z
    .object({
      line: z.number().min(0).max(100).default(80),
      branch: z.number().min(0).max(100).default(80),
      function: z.number().min(0).max(100).default(80),
      statement: z.number().min(0).max(100).default(80),
    })
    .default({
      line: 80,
      branch: 80,
      function: 80,
      statement: 80,
    }),
});

const osvScannerGateSchema = z.object({
  enabled: z.boolean().default(true),
});

const eslintSecurityGateSchema = z.object({
  enabled: z.boolean().default(true),
});

const gatesSchema = z.object({
  eslint: eslintGateSchema.default({}),
  prettier: prettierGateSchema.default({}),
  typescript: typescriptGateSchema.default({}),
  testCoverage: testCoverageGateSchema.default({}),
  osvScanner: osvScannerGateSchema.default({}),
  eslintSecurity: eslintSecurityGateSchema.default({}),
});

const reportingSchema = z.object({
  formats: z.array(z.enum(['terminal', 'json', 'html'])).default(['terminal']),
  outputDir: z.string().default('.quality-gates'),
});

export const configSchema = z.object({
  gates: gatesSchema.default({}),
  reporting: reportingSchema.default({}),
  failFast: z.boolean().default(false),
});

export type ConfigSchema = z.infer<typeof configSchema>;
