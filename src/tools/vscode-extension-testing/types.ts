/**
 * Type definitions for VSCode extension testing tools
 */

import { ChildProcess } from "child_process";
import { Context, McpToolCallResponse } from "../types.js";

/**
 * Represents a running VSCode extension test process
 */
export interface ExtensionProcess {
  sessionId: string;
  extensionPath: string;
  testDir: string;
  prompt: string;
  startTime: Date;
  process: ChildProcess;
  pid?: number;
  output: string[];
  errors: string[];
}

/**
 * Serializable version of ExtensionProcess for storage
 * Excludes the ChildProcess which cannot be serialized
 */
export interface SerializableExtensionProcess {
  sessionId: string;
  extensionPath: string;
  testDir: string;
  prompt: string;
  startTime: string; // ISO string format
  pid?: number;
  output: string[];
  errors: string[];
}

/**
 * Arguments for launching a VSCode extension test
 */
export interface LaunchDevExtensionArgs {
  workspaceDir: string;
  prompt: string;
}

/**
 * Arguments for stopping a VSCode extension test
 */
export interface StopDevExtensionArgs {
  /**
   * ID of the session to stop
   * If not provided, will stop the current session
   */
  sessionId?: string;
}

/**
 * Documentation of the prompt file format
 *
 * The prompt file is now a plain text file with the following format:
 * 1. The user's prompt
 * 2. A separator line "---"
 * 3. Session ID information
 * 4. Instructions for stopping the extension test
 *
 * This interface is kept for documentation purposes only.
 * The actual file is no longer stored as JSON.
 */
export interface PromptFile {
  // No longer used as a structured type
  // The file is now plain text
}

/**
 * Result of stopping an extension test
 */
export interface StopResult {
  sessionId: string;
  duration: number; // in milliseconds
  exitCode: number | null;
  output: string[];
  errors: string[];
}
