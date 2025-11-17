/**
 * Configuration loader for quality-gates.yml
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { configSchema } from './schema.js';
import type { QualityGatesConfig } from '../types.js';

export class ConfigLoader {
  /**
   * Load and validate configuration from a YAML file
   */
  static async load(configPath: string): Promise<QualityGatesConfig> {
    try {
      const absolutePath = resolve(configPath);
      const fileContent = await readFile(absolutePath, 'utf-8');
      const parsed = parse(fileContent);

      // Validate and apply defaults
      const validated = configSchema.parse(parsed);

      return validated as QualityGatesConfig;
    } catch (error) {
      if (error instanceof Error) {
        if ('code' in error && error.code === 'ENOENT') {
          throw new Error(
            `Configuration file not found: ${configPath}\n` +
              'Run "gate-agent init" to create a configuration file.'
          );
        }
        throw new Error(`Failed to load configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Find gate-agent.yml in the current directory or parent directories
   */
  static async findConfig(startDir: string = process.cwd()): Promise<string | null> {
    const configNames = ['gate-agent.yml', 'gate-agent.yaml', '.gate-agent.yml'];
    let currentDir = resolve(startDir);

    // Search up to root
    while (true) {
      for (const configName of configNames) {
        const configPath = resolve(currentDir, configName);
        try {
          await readFile(configPath, 'utf-8');
          return configPath;
        } catch {
          // File doesn't exist, continue searching
        }
      }

      const parentDir = resolve(currentDir, '..');
      if (parentDir === currentDir) {
        // Reached root directory
        break;
      }
      currentDir = parentDir;
    }

    return null;
  }
}
