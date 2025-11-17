/**
 * Core types for the quality gates system
 */

export type GateStatus = 'passed' | 'failed' | 'skipped' | 'error';

export interface GateResult {
  name: string;
  status: GateStatus;
  message?: string;
  errors?: string[];
  warnings?: string[];
  duration: number; // in milliseconds
  details?: Record<string, unknown>;
}

export interface GateRunnerContext {
  projectRoot: string;
  config: QualityGatesConfig;
}

export interface GateRunner {
  name: string;
  enabled: (context: GateRunnerContext) => boolean;
  run: (context: GateRunnerContext) => Promise<GateResult>;
}

// Configuration types
export interface ESLintGateConfig {
  enabled: boolean;
  maxErrors: number;
  maxWarnings: number;
}

export interface PrettierGateConfig {
  enabled: boolean;
}

export interface TypeScriptGateConfig {
  enabled: boolean;
  strict: boolean;
}

export interface TestCoverageGateConfig {
  enabled: boolean;
  threshold: {
    line: number;
    branch: number;
    function: number;
    statement: number;
  };
}

export interface OSVScannerGateConfig {
  enabled: boolean;
}

export interface ESLintSecurityGateConfig {
  enabled: boolean;
}

export interface GatesConfig {
  eslint: ESLintGateConfig;
  prettier: PrettierGateConfig;
  typescript: TypeScriptGateConfig;
  testCoverage: TestCoverageGateConfig;
  osvScanner: OSVScannerGateConfig;
  eslintSecurity: ESLintSecurityGateConfig;
}

export interface ReportingConfig {
  formats: ('terminal' | 'json' | 'html')[];
  outputDir: string;
}

export interface QualityGatesConfig {
  gates: GatesConfig;
  reporting: ReportingConfig;
  failFast: boolean;
}

export interface QualityGatesReport {
  results: GateResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    totalDuration: number;
  };
  timestamp: string;
  success: boolean;
}
