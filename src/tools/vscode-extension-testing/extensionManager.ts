/**
 * Extension Manager for VSCode extension testing
 * Handles the lifecycle of extension test processes
 */

import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { ExtensionProcess, PromptFile, StopResult } from "./types.js";

/**
 * Singleton class to manage VSCode extension test processes
 */
export class ExtensionManager {
  private static instance: ExtensionManager;
  public sessions: Map<string, ExtensionProcess>;
  public currentSessionId: string | null = null;
  private sessionCompletionCallbacks: Map<string, (result: StopResult) => void>;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.sessions = new Map();
    this.sessionCompletionCallbacks = new Map();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ExtensionManager {
    if (!ExtensionManager.instance) {
      ExtensionManager.instance = new ExtensionManager();
    }
    return ExtensionManager.instance;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `test-${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Launch a VSCode extension test
   * @param extensionPath Path to the extension development directory
   * @param prompt Prompt to execute in the extension
   * @param dir Directory to use as the workspace
   * @returns Session ID of the launched extension
   */
  public async launchExtension(
    extensionPath: string,
    prompt: string,
    dir: string
  ): Promise<string> {
    // Validate inputs
    if (!fs.existsSync(extensionPath)) {
      throw new Error(`Extension path does not exist: ${extensionPath}`);
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate a unique session ID
    const sessionId = this.generateSessionId();
    const startTime = new Date();

    // Create prompt file with plain text instructions
    const promptFilePath = path.join(dir, ".PROMPT");
    console.log(promptFilePath);

    // Write the user's prompt and add instructions for stopping the extension
    const promptContent = `${prompt}\n\n---\n\nSession ID: ${sessionId}\n\nTo stop this extension test, use the stop_dev_extension tool.`;

    fs.writeFileSync(promptFilePath, promptContent);

    // Launch VSCode process
    const vscodeProcess = spawn("code", [
      `--extensionDevelopmentPath=${extensionPath}`,
      "--disable-extensions",
      dir,
    ]);

    // Create session object
    const session: ExtensionProcess = {
      sessionId,
      extensionPath,
      testDir: dir,
      prompt,
      startTime,
      process: vscodeProcess,
      pid: vscodeProcess.pid,
      output: [],
      errors: [],
    };

    // Collect output and errors
    vscodeProcess.stdout.on("data", (data) => {
      const output = data.toString();
      session.output.push(output);
      process.stderr.write(`[Extension ${sessionId}] ${output}`);
    });

    vscodeProcess.stderr.on("data", (data) => {
      const error = data.toString();
      session.errors.push(error);
      process.stderr.write(`[Extension ${sessionId} Error] ${error}`);
    });

    // Handle process exit
    vscodeProcess.on("exit", (code) => {
      process.stderr.write(
        `[Extension ${sessionId}] Process exited with code ${code}\n`
      );

      // Handle case when process is killed externally
      this.handleExternalProcessTermination(sessionId, code);
    });

    // Store session
    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    return sessionId;
  }

  /**
   * Get the current session
   */
  public getCurrentSession(): ExtensionProcess | undefined {
    if (!this.currentSessionId) return undefined;
    return this.sessions.get(this.currentSessionId);
  }

  /**
   * Stop the current session
   * @returns Result of stopping the session
   */
  public async stopCurrentSession(): Promise<StopResult | undefined> {
    const session = this.getCurrentSession();
    if (!session) {
      return undefined;
    }

    // Calculate duration
    const endTime = new Date();
    const duration = endTime.getTime() - session.startTime.getTime();

    // Kill the process
    let exitCode: number | null = null;
    try {
      // Try graceful termination first
      session.process.kill("SIGTERM");

      // Wait for process to exit (max 5 seconds)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // Force kill if it doesn't exit
          if (session.process.killed === false) {
            session.process.kill("SIGKILL");
          }
          resolve();
        }, 5000);

        session.process.once("exit", (code) => {
          exitCode = code;
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      process.stderr.write(
        `[Extension ${session.sessionId}] Error stopping process: ${error}\n`
      );
    }

    // Clean up prompt file
    try {
      const promptFilePath = path.join(session.testDir, ".PROMPT");
      if (fs.existsSync(promptFilePath)) {
        fs.unlinkSync(promptFilePath);
      }
    } catch (error) {
      process.stderr.write(
        `[Extension ${session.sessionId}] Error cleaning up prompt file: ${error}\n`
      );
    }

    // Create result object
    const result: StopResult = {
      sessionId: session.sessionId,
      duration,
      exitCode,
      output: session.output,
      errors: session.errors,
    };

    // Signal completion to any waiting callbacks
    const callback = this.sessionCompletionCallbacks.get(session.sessionId);
    if (callback) {
      process.stderr.write(
        `[Extension ${session.sessionId}] Signaling completion to waiting callback\n`
      );
      callback(result);
      this.sessionCompletionCallbacks.delete(session.sessionId);
    }

    // Remove session from map
    this.sessions.delete(session.sessionId);
    if (this.currentSessionId === session.sessionId) {
      this.currentSessionId = null;
    }

    // Return results
    return result;
  }

  /**
   * Stop a specific session by ID
   * @param sessionId ID of the session to stop
   * @returns Result of stopping the session
   */
  public async stopSessionById(
    sessionId: string
  ): Promise<StopResult | undefined> {
    // Check if session exists
    const session = this.sessions.get(sessionId);
    if (!session) {
      process.stderr.write(
        `[ExtensionManager] Session not found: ${sessionId}\n`
      );
      return undefined;
    }

    // Set as current session temporarily to reuse stopCurrentSession logic
    const previousCurrentSessionId = this.currentSessionId;
    this.currentSessionId = sessionId;

    // Stop the session
    const result = await this.stopCurrentSession();

    // Restore previous current session if it wasn't the one we just stopped
    if (previousCurrentSessionId && previousCurrentSessionId !== sessionId) {
      this.currentSessionId = previousCurrentSessionId;
    }

    return result;
  }

  /**
   * Get all active sessions
   */
  public getAllSessions(): ExtensionProcess[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up all sessions
   */
  public async cleanupAllSessions(): Promise<void> {
    const sessions = this.getAllSessions();
    for (const session of sessions) {
      try {
        session.process.kill("SIGKILL");
        const promptFilePath = path.join(session.testDir, ".PROMPT");
        if (fs.existsSync(promptFilePath)) {
          fs.unlinkSync(promptFilePath);
        }
      } catch (error) {
        process.stderr.write(
          `[Extension ${session.sessionId}] Error during cleanup: ${error}\n`
        );
      }
    }
    this.sessions.clear();
    this.currentSessionId = null;
  }

  /**
   * Wait for a session to complete
   * @param sessionId Session ID to wait for
   * @returns Promise that resolves when the session completes
   */
  public waitForSessionCompletion(sessionId: string): Promise<StopResult> {
    return new Promise<StopResult>((resolve) => {
      // Check if session exists
      if (!this.sessions.has(sessionId)) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Store callback to be called when session completes
      this.sessionCompletionCallbacks.set(sessionId, resolve);

      process.stderr.write(
        `[ExtensionManager] Waiting for session ${sessionId} to complete\n`
      );
    });
  }

  /**
   * Handle external process termination
   * This is called when a process exits without going through stopCurrentSession
   * @param sessionId Session ID of the terminated process
   * @param exitCode Exit code of the process
   */
  private handleExternalProcessTermination(
    sessionId: string,
    exitCode: number | null
  ): void {
    // Check if session exists and has a completion callback
    const session = this.sessions.get(sessionId);
    const callback = this.sessionCompletionCallbacks.get(sessionId);

    if (session && callback) {
      process.stderr.write(
        `[Extension ${sessionId}] Process was terminated externally, resolving waiting promise\n`
      );

      // Calculate duration
      const endTime = new Date();
      const duration = endTime.getTime() - session.startTime.getTime();

      // Create result object
      const result: StopResult = {
        sessionId: session.sessionId,
        duration,
        exitCode,
        output: session.output,
        errors: session.errors,
      };

      // Signal completion to waiting callback
      callback(result);
      this.sessionCompletionCallbacks.delete(sessionId);

      // Clean up session
      this.sessions.delete(sessionId);
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }

      // Clean up prompt file
      try {
        const promptFilePath = path.join(session.testDir, ".PROMPT");
        if (fs.existsSync(promptFilePath)) {
          fs.unlinkSync(promptFilePath);
        }
      } catch (error) {
        process.stderr.write(
          `[Extension ${sessionId}] Error cleaning up prompt file after external termination: ${error}\n`
        );
      }
    }
  }
}
