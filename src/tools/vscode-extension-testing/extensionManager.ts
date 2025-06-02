/**
 * Extension Manager for VSCode extension testing
 * Handles the lifecycle of extension test processes
 */

import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { ExtensionProcess, PromptFile, StopResult } from "./types.js";
import { SessionStorage } from "./sessionStorage.js";

/**
 * Singleton class to manage VSCode extension test processes
 * Uses persistent storage to track sessions across different processes
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
    // Load sessions from persistent storage
    this.sessions = SessionStorage.loadSessions();
    this.currentSessionId = SessionStorage.loadCurrentSessionId();
    this.sessionCompletionCallbacks = new Map();

    // Clean up any stale sessions
    SessionStorage.cleanupStaleSessions();

    // Start polling for completion signals
    this.startCompletionSignalPolling();
  }

  /**
   * Start polling for completion signals from other processes
   * This allows promises to resolve even if the stop command is issued from a different process
   */
  private startCompletionSignalPolling(): void {
    // Check for completion signals every 500ms
    const pollInterval = 500;

    const checkCompletionSignals = () => {
      // Get all sessions that have callbacks waiting
      const waitingSessions = Array.from(
        this.sessionCompletionCallbacks.keys()
      );

      for (const sessionId of waitingSessions) {
        // Check if there's a completion signal for this session
        const result = SessionStorage.checkCompletionSignal(sessionId);

        if (result) {
          process.stderr.write(
            `[ExtensionManager] Found completion signal for session: ${sessionId}\n`
          );

          // Get the callback
          const callback = this.sessionCompletionCallbacks.get(sessionId);

          if (callback) {
            process.stderr.write(
              `[ExtensionManager] Calling callback for session: ${sessionId}\n`
            );

            // Call the callback with the result
            callback(result);

            // Remove the callback from the map
            this.sessionCompletionCallbacks.delete(sessionId);

            // Remove the completion signal
            SessionStorage.removeCompletionSignal(sessionId);

            // Remove the session from memory
            this.sessions.delete(sessionId);
            if (this.currentSessionId === sessionId) {
              this.currentSessionId = null;
              SessionStorage.saveCurrentSessionId(null);
            }
          }
        }
      }

      // Schedule the next check
      setTimeout(checkCompletionSignals, pollInterval);
    };

    // Start the polling
    setTimeout(checkCompletionSignals, pollInterval);
  }

  /**
   * Kill a process by its PID
   * This is a more direct approach than using the process object
   * @param pid Process ID to kill
   */
  private killProcessByPid(pid: number): void {
    try {
      // First try SIGTERM for graceful shutdown
      process.stderr.write(
        `[ExtensionManager] Sending SIGTERM to process ${pid}\n`
      );
      process.kill(pid, "SIGTERM");

      // Give it a moment to terminate gracefully
      setTimeout(() => {
        // Check if process is still running
        if (SessionStorage.isProcessRunning(pid)) {
          process.stderr.write(
            `[ExtensionManager] Process ${pid} did not terminate gracefully, using SIGKILL\n`
          );

          // Force kill
          process.kill(pid, "SIGKILL");
        } else {
          process.stderr.write(
            `[ExtensionManager] Process ${pid} terminated successfully with SIGTERM\n`
          );
        }
      }, 2000);
    } catch (error) {
      process.stderr.write(
        `[ExtensionManager] Error killing process ${pid}: ${error}\n`
      );
      // Process might already be gone, which is fine
    }
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
    process.stderr.write(
      `[ExtensionManager] launchExtension called with path: ${extensionPath}, dir: ${dir}\n`
    );

    // Validate inputs
    if (!fs.existsSync(extensionPath)) {
      process.stderr.write(
        `[ExtensionManager] Extension path does not exist: ${extensionPath}\n`
      );
      throw new Error(`Extension path does not exist: ${extensionPath}`);
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      process.stderr.write(`[ExtensionManager] Creating directory: ${dir}\n`);
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate a unique session ID
    const sessionId = this.generateSessionId();
    const startTime = new Date();
    process.stderr.write(
      `[ExtensionManager] Generated session ID: ${sessionId}\n`
    );

    // Create prompt file with plain text instructions
    const promptFilePath = path.join(dir, ".PROMPT");
    process.stderr.write(
      `[ExtensionManager] Writing prompt file to: ${promptFilePath}\n`
    );

    // Write the user's prompt and add instructions for stopping the extension
    const promptContent = `${prompt}

---

IMPORTANT: WHEN YOU HAVE COMPLETED THE TASK ABOVE, YOU MUST EXPLICITLY CALL THE FOLLOWING MCP TOOL:

use_mcp_tool(
  server_name: "kilo-dev-mcp-server",
  tool_name: "stop_dev_extension",
  arguments: {
    "sessionId": "${sessionId}"
  }
)

Session ID: ${sessionId}

This will signal that you have finished the task and allow the system to continue.
DO NOT FORGET to call this tool when you are done. The system will remain blocked until you do.`;

    fs.writeFileSync(promptFilePath, promptContent);
    process.stderr.write(
      `[ExtensionManager] Prompt file written successfully\n`
    );

    // Launch VSCode process
    process.stderr.write(`[ExtensionManager] Spawning VSCode process\n`);
    const vscodeProcess = spawn("code", [
      `--extensionDevelopmentPath=${extensionPath}`,
      "--disable-extensions",
      "--wait", // Keep the process alive until the window is closed
      dir,
    ]);
    process.stderr.write(
      `[ExtensionManager] VSCode process spawned with PID: ${vscodeProcess.pid}\n`
    );

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

      process.stderr.write(
        `[Extension ${sessionId}] Process exit event triggered, calling handleExternalProcessTermination\n`
      );

      // Handle case when process is killed externally
      this.handleExternalProcessTermination(sessionId, code);
    });

    // Store session in memory
    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    // Persist to storage
    SessionStorage.updateSession(session);
    SessionStorage.saveCurrentSessionId(sessionId);

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
      // With the --wait flag, the process object should be the actual VS Code window
      // So we can kill it directly
      process.stderr.write(
        `[Extension ${session.sessionId}] Attempting to kill VS Code window\n`
      );

      if (session.process && !session.process.killed) {
        // Try graceful termination first
        process.stderr.write(
          `[Extension ${session.sessionId}] Sending SIGTERM to process\n`
        );
        session.process.kill("SIGTERM");

        // Wait for process to exit (max 5 seconds)
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            // Force kill if it doesn't exit
            if (session.process.killed === false) {
              process.stderr.write(
                `[Extension ${session.sessionId}] Process did not terminate gracefully, using SIGKILL\n`
              );
              session.process.kill("SIGKILL");
            }
            resolve();
          }, 5000);

          session.process.once("exit", (code) => {
            exitCode = code;
            process.stderr.write(
              `[Extension ${session.sessionId}] Process exited with code ${code}\n`
            );
            clearTimeout(timeout);
            resolve();
          });
        });
      } else if (session.pid) {
        // Fallback to PID-based killing if process object is not available or already killed
        // This is useful for cross-process scenarios
        process.stderr.write(
          `[Extension ${session.sessionId}] Process object unavailable, attempting to kill by PID: ${session.pid}\n`
        );
        this.killProcessByPid(session.pid);
      }
    } catch (error) {
      process.stderr.write(
        `[Extension ${session.sessionId}] Error stopping process: ${error}\n`
      );
    }

    // No longer cleaning up prompt file
    process.stderr.write(
      `[Extension ${session.sessionId}] Skipping prompt file cleanup as requested\n`
    );

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
      process.stderr.write(
        `[Extension ${session.sessionId}] About to resolve Promise in stopCurrentSession\n`
      );

      // Call the callback with the result to resolve the Promise
      callback(result);

      // Remove the callback from the map
      this.sessionCompletionCallbacks.delete(session.sessionId);

      process.stderr.write(
        `[Extension ${session.sessionId}] Promise resolved and callback removed from map\n`
      );
    } else {
      process.stderr.write(
        `[Extension ${session.sessionId}] No waiting callback found in this process, creating completion signal\n`
      );

      // Create a completion signal for other processes
      SessionStorage.signalSessionCompletion(session.sessionId, result);
    }

    // Remove session from memory
    this.sessions.delete(session.sessionId);
    if (this.currentSessionId === session.sessionId) {
      this.currentSessionId = null;
    }

    // Remove from persistent storage
    SessionStorage.removeSession(session.sessionId);

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
        // With --wait flag, the process object should be the actual VS Code window
        if (session.process && !session.process.killed) {
          process.stderr.write(
            `[Extension ${session.sessionId}] Killing process during cleanup\n`
          );
          session.process.kill("SIGKILL");
        } else if (session.pid) {
          // Fallback to PID-based killing
          process.stderr.write(
            `[Extension ${session.sessionId}] Killing by PID during cleanup: ${session.pid}\n`
          );
          this.killProcessByPid(session.pid);
        }

        // No longer cleaning up prompt file
        process.stderr.write(
          `[Extension ${session.sessionId}] Skipping prompt file cleanup during cleanupAllSessions\n`
        );
      } catch (error) {
        process.stderr.write(
          `[Extension ${session.sessionId}] Error during cleanup: ${error}\n`
        );
      }
    }
    // Clear from memory
    this.sessions.clear();
    this.currentSessionId = null;

    // Clear from persistent storage
    SessionStorage.saveSessions(new Map());
    SessionStorage.saveCurrentSessionId(null);
  }

  /**
   * Wait for a session to complete
   * @param sessionId Session ID to wait for
   * @returns Promise that resolves when the session completes
   */
  public waitForSessionCompletion(sessionId: string): Promise<StopResult> {
    process.stderr.write(
      `[ExtensionManager] waitForSessionCompletion called for session: ${sessionId}\n`
    );

    return new Promise<StopResult>(async (resolve, reject) => {
      await new Promise((r) => setTimeout(r, 3000));

      // Check if session exists
      if (!this.sessions.has(sessionId)) {
        process.stderr.write(
          `[ExtensionManager] Session not found: ${sessionId}\n`
        );
        // Properly reject the promise instead of throwing
        reject(new Error(`Session not found: ${sessionId}`));
        return;
      }

      // Check if there's already a completion signal for this session
      const existingResult = SessionStorage.checkCompletionSignal(sessionId);
      if (existingResult) {
        process.stderr.write(
          `[ExtensionManager] Found existing completion signal for session: ${sessionId}\n`
        );

        // Remove the completion signal
        SessionStorage.removeCompletionSignal(sessionId);

        // Remove the session from memory
        this.sessions.delete(sessionId);
        if (this.currentSessionId === sessionId) {
          this.currentSessionId = null;
          SessionStorage.saveCurrentSessionId(null);
        }

        // Resolve the promise immediately
        resolve(existingResult);
        return;
      }

      process.stderr.write(
        `[ExtensionManager] Creating Promise for session: ${sessionId}\n`
      );

      // Store callback to be called when session completes
      this.sessionCompletionCallbacks.set(sessionId, (result) => {
        process.stderr.write(
          `[ExtensionManager] Resolving Promise for session: ${sessionId}\n`
        );
        resolve(result);
      });

      process.stderr.write(
        `[ExtensionManager] Promise created and callback stored for session ${sessionId}\n`
      );

      process.stderr.write(
        `[ExtensionManager] Waiting for session ${sessionId} to complete. This Promise will not resolve until stopDevExtension is called.\n`
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
    process.stderr.write(
      `[ExtensionManager] handleExternalProcessTermination called for session: ${sessionId} with exit code: ${exitCode}\n`
    );

    // Check if session exists and has a completion callback
    const session = this.sessions.get(sessionId);
    const callback = this.sessionCompletionCallbacks.get(sessionId);

    process.stderr.write(
      `[ExtensionManager] Session exists: ${!!session}, Callback exists: ${!!callback}\n`
    );

    if (session && callback) {
      process.stderr.write(
        `[Extension ${sessionId}] Process was terminated externally, resolving waiting promise\n`
      );

      // Calculate duration
      const endTime = new Date();
      const duration = endTime.getTime() - session.startTime.getTime();
      process.stderr.write(
        `[Extension ${sessionId}] Session duration: ${duration}ms\n`
      );

      // Create result object
      const result: StopResult = {
        sessionId: session.sessionId,
        duration,
        exitCode,
        output: session.output,
        errors: session.errors,
      };

      process.stderr.write(
        `[Extension ${sessionId}] About to call completion callback\n`
      );

      // Signal completion to waiting callback
      callback(result);

      // Remove the callback from the map
      this.sessionCompletionCallbacks.delete(sessionId);

      process.stderr.write(
        `[Extension ${sessionId}] Completion callback called and removed from map\n`
      );

      // Also create a completion signal for other processes
      SessionStorage.signalSessionCompletion(sessionId, result);

      // Clean up session from memory
      this.sessions.delete(sessionId);
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }

      // Clean up from persistent storage
      SessionStorage.removeSession(sessionId);

      // No longer cleaning up prompt file
      process.stderr.write(
        `[Extension ${sessionId}] Skipping prompt file cleanup after external termination as requested\n`
      );
    }
  }
}
