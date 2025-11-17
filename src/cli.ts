#!/usr/bin/env node

/**
 * CLI entry point for quality-gates
 */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ConfigLoader } from './config/loader.js';
import { GateOrchestrator } from './runner/orchestrator.js';
import { allGates } from './gates/index.js';
import { TerminalReporter } from './reporters/terminal.js';
import { JSONReporter } from './reporters/json.js';
import { HTMLReporter } from './reporters/html.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('gate-agent')
  .description('Configurable CLI tool for running quality gates')
  .version('0.1.0');

// Run command
program
  .command('run')
  .description('Run quality gates')
  .option('-c, --config <path>', 'Path to gate-agent.yml', 'gate-agent.yml')
  .option('--cwd <path>', 'Working directory', process.cwd())
  .action(async (options: { config: string; cwd: string }) => {
    try {
      const projectRoot = resolve(options.cwd);

      // Load configuration
      const configPath = await ConfigLoader.findConfig(projectRoot);

      if (!configPath) {
        console.error('Error: No gate-agent.yml configuration found.');
        console.error('Run "gate-agent init" to create one.');
        process.exit(1);
      }

      const config = await ConfigLoader.load(configPath);

      console.log(`Running quality gates from: ${projectRoot}`);
      console.log(`Using config: ${configPath}\n`);

      // Set up orchestrator
      const orchestrator = new GateOrchestrator();

      // Register all gates
      for (const gate of allGates) {
        orchestrator.register(gate);
      }

      // Run gates
      const report = await orchestrator.run({
        projectRoot,
        config,
      });

      // Generate reports
      const reporters = {
        terminal: new TerminalReporter(),
        json: new JSONReporter(),
        html: new HTMLReporter(),
      };

      for (const format of config.reporting.formats) {
        if (format === 'terminal') {
          reporters.terminal.report(report);
        } else if (format === 'json') {
          await reporters.json.report(report, config.reporting.outputDir, projectRoot);
        } else if (format === 'html') {
          await reporters.html.report(report, config.reporting.outputDir, projectRoot);
        }
      }

      // Exit with appropriate code
      process.exit(report.success ? 0 : 1);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(2);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize gate-agent.yml configuration file')
  .option('--cwd <path>', 'Working directory', process.cwd())
  .action(async (options: { cwd: string }) => {
    try {
      const projectRoot = resolve(options.cwd);
      const targetPath = resolve(projectRoot, 'gate-agent.yml');

      // Check if config already exists
      const existingConfig = await ConfigLoader.findConfig(projectRoot);
      if (existingConfig) {
        console.error(`Configuration file already exists at: ${existingConfig}`);
        process.exit(1);
      }

      // Copy template
      const templatePath = resolve(__dirname, '..', 'templates', 'gate-agent.yml');
      await mkdir(dirname(targetPath), { recursive: true });
      await copyFile(templatePath, targetPath);

      console.log(`Created gate-agent.yml at: ${targetPath}`);
      console.log('\nNext steps:');
      console.log('1. Edit gate-agent.yml to configure your quality gates');
      console.log('2. Run "gate-agent run" to execute quality gates');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(2);
    }
  });

program.parse();
