/**
 * Test script for VSCode extension testing persistence
 * 
 * This script demonstrates how the session persistence works across different processes.
 * It can be run in two modes:
 * 1. Launch mode: Launches a VSCode extension and exits
 * 2. Stop mode: Stops a previously launched VSCode extension
 * 
 * Usage:
 *   node examples/test-vscode-extension-persistence.js launch <extension-path> <prompt> <launch-dir>
 *   node examples/test-vscode-extension-persistence.js stop <session-id>
 */

import { createMcpClient } from '../src/minimal-mcp.js';

// Parse command line arguments
const mode = process.argv[2];
if (!mode || (mode !== 'launch' && mode !== 'stop')) {
    console.error('Usage:');
    console.error('  node examples/test-vscode-extension-persistence.js launch <extension-path> <prompt> <launch-dir>');
    console.error('  node examples/test-vscode-extension-persistence.js stop <session-id>');
    process.exit(1);
}

// Create MCP client
const client = createMcpClient();

async function main() {
    try {
        if (mode === 'launch') {
            // Launch mode
            const extensionPath = process.argv[3];
            const prompt = process.argv[4];
            const launchDir = process.argv[5];

            if (!extensionPath || !prompt || !launchDir) {
                console.error('Error: extension-path, prompt, and launch-dir are required for launch mode');
                process.exit(1);
            }

            console.log(`Launching VSCode extension with path: ${extensionPath}`);
            console.log(`With prompt: ${prompt}`);
            console.log(`Using launch directory: ${launchDir}`);

            const result = await client.callTool('launch_dev_extension', {
                extensionPath,
                prompt,
                launchDir
            });

            // Extract session ID from the result
            const sessionIdMatch = result.content[0].text.match(/session ID: ([a-z0-9-]+)/i);
            const sessionId = sessionIdMatch ? sessionIdMatch[1] : 'unknown';

            console.log('\nLaunch result:');
            console.log(result.content[0].text);
            console.log('\n---------------------------------------');
            console.log(`To stop this session from another process, run:`);
            console.log(`node examples/test-vscode-extension-persistence.js stop ${sessionId}`);

        } else if (mode === 'stop') {
            // Stop mode
            const sessionId = process.argv[3];

            if (!sessionId) {
                console.error('Error: session-id is required for stop mode');
                process.exit(1);
            }

            console.log(`Stopping VSCode extension session: ${sessionId}`);

            const result = await client.callTool('stop_dev_extension', {
                sessionId
            });

            console.log('\nStop result:');
            console.log(result.content[0].text);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(console.error);