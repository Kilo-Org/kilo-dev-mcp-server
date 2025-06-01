/**
 * Session Storage for VSCode extension testing
 * Provides persistent storage for extension test sessions across different processes
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  ExtensionProcess,
  SerializableExtensionProcess,
  StopResult,
} from "./types.js";
import { ChildProcess, spawn } from "child_process";

/**
 * Path to the session storage file
 */
const SESSION_STORAGE_DIR = path.join(os.tmpdir(), "kilo-dev-mcp-server");
const SESSION_STORAGE_FILE = path.join(
  SESSION_STORAGE_DIR,
  "vscode-extension-sessions.json"
);

/**
 * Ensures the session storage directory exists
 */
function ensureStorageDirectoryExists(): void {
  if (!fs.existsSync(SESSION_STORAGE_DIR)) {
    fs.mkdirSync(SESSION_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Converts a serializable session to a full session with a live process
 * @param serializedSession The serialized session to convert
 * @returns The full session with a live process
 */
function deserializeSession(
  serializedSession: SerializableExtensionProcess
): ExtensionProcess {
  // Recreate a process object if the PID exists
  let process: ChildProcess;

  if (serializedSession.pid) {
    // Create a dummy process object
    // We can't fully restore the process, but we can create an object with the PID
    // that allows us to attempt to kill it
    process = spawn("echo", ["dummy"], { detached: true, stdio: "ignore" });

    // Replace the PID with the stored one
    // This is a hack, but it allows us to call process.kill() on the correct PID
    Object.defineProperty(process, "pid", {
      value: serializedSession.pid,
      writable: false,
    });
  } else {
    // Create a dummy process that's already exited
    process = spawn("echo", ["dummy"], { detached: true, stdio: "ignore" });
    process.kill();
  }

  return {
    ...serializedSession,
    startTime: new Date(serializedSession.startTime),
    process,
  };
}

/**
 * Converts a full session to a serializable format
 * @param session The session to serialize
 * @returns The serialized session
 */
function serializeSession(
  session: ExtensionProcess
): SerializableExtensionProcess {
  return {
    sessionId: session.sessionId,
    extensionPath: session.extensionPath,
    testDir: session.testDir,
    prompt: session.prompt,
    startTime: session.startTime.toISOString(),
    pid: session.pid,
    output: session.output,
    errors: session.errors,
  };
}

/**
 * Class to manage persistent storage of extension test sessions
 */
export class SessionStorage {
  /**
   * Save sessions to the storage file
   * @param sessions Map of sessions to save
   */
  public static saveSessions(sessions: Map<string, ExtensionProcess>): void {
    ensureStorageDirectoryExists();

    // Convert sessions to serializable format
    const serializedSessions: Record<string, SerializableExtensionProcess> = {};

    sessions.forEach((session, sessionId) => {
      serializedSessions[sessionId] = serializeSession(session);
    });

    // Write to file
    fs.writeFileSync(
      SESSION_STORAGE_FILE,
      JSON.stringify(serializedSessions, null, 2)
    );
  }

  /**
   * Load sessions from the storage file
   * @returns Map of sessions
   */
  public static loadSessions(): Map<string, ExtensionProcess> {
    ensureStorageDirectoryExists();

    const sessions = new Map<string, ExtensionProcess>();

    // Check if file exists
    if (!fs.existsSync(SESSION_STORAGE_FILE)) {
      return sessions;
    }

    try {
      // Read and parse file
      const fileContent = fs.readFileSync(SESSION_STORAGE_FILE, "utf-8");
      const serializedSessions: Record<string, SerializableExtensionProcess> =
        JSON.parse(fileContent);

      // Convert to session objects
      Object.entries(serializedSessions).forEach(
        ([sessionId, serializedSession]) => {
          sessions.set(sessionId, deserializeSession(serializedSession));
        }
      );
    } catch (error) {
      console.error(`Error loading sessions: ${error}`);
      // If there's an error, return an empty map
      return new Map<string, ExtensionProcess>();
    }

    return sessions;
  }

  /**
   * Save the current session ID
   * @param sessionId Current session ID
   */
  public static saveCurrentSessionId(sessionId: string | null): void {
    ensureStorageDirectoryExists();

    fs.writeFileSync(
      path.join(SESSION_STORAGE_DIR, "current-session.txt"),
      sessionId || ""
    );
  }

  /**
   * Load the current session ID
   * @returns Current session ID
   */
  public static loadCurrentSessionId(): string | null {
    ensureStorageDirectoryExists();

    const filePath = path.join(SESSION_STORAGE_DIR, "current-session.txt");

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const sessionId = fs.readFileSync(filePath, "utf-8").trim();
    return sessionId || null;
  }

  /**
   * Update a specific session in the storage
   * @param session Session to update
   */
  public static updateSession(session: ExtensionProcess): void {
    const sessions = SessionStorage.loadSessions();
    sessions.set(session.sessionId, session);
    SessionStorage.saveSessions(sessions);
  }

  /**
   * Remove a session from storage
   * @param sessionId ID of the session to remove
   */
  public static removeSession(sessionId: string): void {
    const sessions = SessionStorage.loadSessions();
    sessions.delete(sessionId);
    SessionStorage.saveSessions(sessions);

    // If this was the current session, clear it
    const currentSessionId = SessionStorage.loadCurrentSessionId();
    if (currentSessionId === sessionId) {
      SessionStorage.saveCurrentSessionId(null);
    }
  }

  /**
   * Check if a process with the given PID is still running
   * @param pid Process ID to check
   * @returns True if the process is running, false otherwise
   */
  public static isProcessRunning(pid: number): boolean {
    try {
      // Sending signal 0 doesn't actually send a signal,
      // but it checks if the process exists
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up stale sessions (processes that are no longer running)
   */
  public static cleanupStaleSessions(): void {
    const sessions = SessionStorage.loadSessions();
    let hasChanges = false;

    sessions.forEach((session, sessionId) => {
      if (session.pid && !SessionStorage.isProcessRunning(session.pid)) {
        sessions.delete(sessionId);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      SessionStorage.saveSessions(sessions);
    }
  }
}
