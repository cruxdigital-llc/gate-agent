/**
 * Utility functions for running commands
 */

import { execa, type Options as ExecaOptions } from 'execa';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

/**
 * Run a command and return the result
 */
export async function runCommand(
  command: string,
  args: string[],
  options?: ExecaOptions
): Promise<CommandResult> {
  try {
    const result = await execa(command, args, {
      reject: false,
      ...options,
    });

    return {
      stdout: String(result.stdout ?? ''),
      stderr: String(result.stderr ?? ''),
      exitCode: result.exitCode ?? 1,
      success: result.exitCode === 0,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        stdout: '',
        stderr: error.message,
        exitCode: 1,
        success: false,
      };
    }
    throw error;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a command is available in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    await execa('which', [command], { reject: false });
    return true;
  } catch {
    return false;
  }
}

/**
 * Find a file in the project root or node_modules
 */
export async function findProjectFile(
  projectRoot: string,
  fileName: string
): Promise<string | null> {
  // Check in project root
  const rootPath = resolve(projectRoot, fileName);
  if (await fileExists(rootPath)) {
    return rootPath;
  }

  // Check in node_modules/.bin
  const binPath = resolve(projectRoot, 'node_modules', '.bin', fileName);
  if (await fileExists(binPath)) {
    return binPath;
  }

  return null;
}

/**
 * Parse JSON safely
 */
export function parseJSON<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
