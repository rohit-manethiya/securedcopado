const child_process = require('child_process');
const { writeFileSync, unlinkSync, existsSync } = require('fs');
const path = require('path');
const os = require('os');

// Ensure 'path' is imported if not already, for path.join
// Ensure 'Buffer' is available if not already, for Buffer.from
// Ensure 'os' is imported if not already, for os.tmpdir


// Function to execute shell commands and log output
async function executeCommand(command, options = {}) {
    console.log(`Executing command: ${command}`);
    try {
        // Use stdio: 'pipe' for commands whose output you want to capture,
        // or 'inherit' for commands whose output should go directly to console.
        // For simple logging commands, 'inherit' is fine.
        const result = child_process.execSync(command, {
            encoding: 'utf8',
            // Only use stdio: 'inherit' if you don't need to capture the output for parsing.
            // For general commands where you just want to see output, this is fine.
            // For 'ssh-agent -s' specifically, we need to *capture* its output.
            stdio: 'inherit',
            ...options
        });
        return result; // This will typically be empty if stdio is 'inherit'
    } catch (error) {
        console.error(`Command failed: ${command}`);
        console.error(`Error: ${error.message}`);
        // Log stderr if available and not inherited
        if (error.stderr && options.stdio !== 'inherit') {
            console.error("Stderr:", error.stderr.toString());
        }
        throw error; // Re-throw to stop execution if command fails
    }
}

// Function to start SSH agent and load key
async function startSshAgentAndLoadKey() {
    // You can choose which environment variable to use:
    // process.env.SSH_SIGNING_PRIVATE_KEY_PLAINTEXT or process.env.SSH_SIGNING_PRIVATE_KEY_BASE64
    // Make sure the one you choose is correctly set with newlines handled (for plaintext)
    const privateKeyEnvVar = process.env.SSH_SIGNING_PRIVATE_KEY_BASE64; // Or SSH_SIGNING_PRIVATE_KEY_PLAINTEXT

    if (!privateKeyEnvVar) {
        console.error("ERROR: SSH_SIGNING_PRIVATE_KEY_BASE64 environment variable is not set.");
        console.error("Please set this environment variable with your base64-encoded private key.");
        return false;
    }

    const tempKeyPath = path.join(os.tmpdir(), 'nodejs_signing_key');

    try {
        console.log("Decoding base64 private key and writing to temporary file...");
        // If using SSH_SIGNING_PRIVATE_KEY_PLAINTEXT, just use it directly:
        // const decodedPrivateKey = privateKeyEnvVar;
        const decodedPrivateKey = Buffer.from(privateKeyEnvVar, 'base64').toString('utf8');
        writeFileSync(tempKeyPath, decodedPrivateKey);
        console.log(`Private key written to: ${tempKeyPath}`);

        console.log(`Setting correct permissions (chmod 600) for ${tempKeyPath}...`);
        await executeCommand(`chmod 600 ${tempKeyPath}`);
        console.log("Permissions set successfully.");

        console.log("Attempting to start SSH agent and capture its variables...");
        const agentOutput = child_process.execSync('ssh-agent -s', { encoding: 'utf8' });
        console.log("SSH agent raw output captured:\n", agentOutput);

        const matchSock = agentOutput.match(/SSH_AUTH_SOCK=([^;]+);/);
        const matchPid = agentOutput.match(/SSH_AGENT_PID=(\d+);/);

        if (matchSock && matchPid) {
            process.env.SSH_AUTH_SOCK = matchSock[1];
            process.env.SSH_AGENT_PID = matchPid[1];
            console.log(`SSH_AUTH_SOCK set to: ${process.env.SSH_AUTH_SOCK}`);
            console.log(`SSH_AGENT_PID set to: ${process.env.SSH_AGENT_PID}`);
        } else {
            console.error("Failed to parse SSH agent output to set environment variables.");
            console.error("Raw output was:", agentOutput);
            return false;
        }

        console.log(`Attempting to add SSH key from ${tempKeyPath} to agent...`);
        await executeCommand(`ssh-add ${tempKeyPath}`);
        console.log("SSH key added to agent.");

        await executeCommand('ssh-add -l'); // List keys to confirm it's loaded

        return true;
    } catch (error) {
        console.error("Failed during SSH key setup at runtime:", error.message);
        if (error.stderr && error.stderr.toString()) {
            console.error("Stderr:", error.stderr.toString());
        }
        return false;
    } finally {
        try {
            if (existsSync(tempKeyPath)) {
                unlinkSync(tempKeyPath);
                console.log("Cleaned up temporary private key file.");
            }
        } catch (unlinkError) {
            console.warn("Warning: Could not delete temporary private key file:", unlinkError.message);
        }
    }
}

// --- Main Script Logic to use actual repository ---

async function main() {
    console.log("Starting Node.js Git signing script for actual repository commit...");

    const isAgentReady = await startSshAgentAndLoadKey();
    if (!isAgentReady) {
        console.error("Critical error: SSH agent setup failed. Aborting commit signing.");
        process.exit(1);
    }

    try {
        // ASSUMPTION: This script is run from within the root directory of an existing Git repository.
        console.log("Operating in current Git repository.");

        // Ensure Git user name and email are configured
        // These can also be configured globally or inherited, but setting them here ensures consistency.
        await executeCommand('git config user.name "Rohit Manethiya"');
        await executeCommand('git config user.email "rmanethiya@copado.com"');

        // Configure Git for SSH signing
        await executeCommand('git config --global gpg.format ssh');
        // REPLACE this with your actual public key content.
        // This is the public key that corresponds to the private key loaded into the agent.
        const publicSigningKeyContent = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINGtNcMBZGyPV3Fb4vjNWV3Uy/aHva7dqnQy6MuLCiGQ";

        // It's generally better to set user.signingkey as a local config for the specific repo,
        // unless you intend to use this key for ALL repos on the system.
        await executeCommand(`git config --local user.signingkey "key::${publicSigningKeyContent}"`);

        // Create the allowed_signers file in the current working directory (repo root)
        // This file lists which public keys are allowed to sign commits for this repo.
        // It should contain the email address and the full public key for allowed signers.
        const allowedSignersFilePath = path.join(process.cwd(), ".git/allowed_signers"); // Place it within .git/ for better encapsulation
        writeFileSync(allowedSignersFilePath, `rmanethiya@copado.com ${publicSigningKeyContent}`);
        console.log(`Allowed signers file created at: ${allowedSignersFilePath}`);

        // Tell Git where to find the allowed_signers file for local repo
        // This must point to the exact path where you created the file.
        await executeCommand(`git config --local gpg.ssh.allowedSignersFile "${allowedSignersFilePath}"`);
        console.log("Git signing configuration updated for local repository.");

        // --- Demonstrate a change and commit in the actual repository ---
        // In a real scenario, this would be where your application makes changes
        // to files that need to be committed, or you're committing pre-existing changes.
        const commitFileName = 'actual_repo_test_file.txt';
        writeFileSync(commitFileName, `Hello from Node.js in actual repo at ${new Date().toISOString()}\n`);
        console.log(`Created/updated ${commitFileName}`);
        await executeCommand(`git add ${commitFileName}`);
        console.log(`Added ${commitFileName} to staging.`);

        console.log("Attempting to perform a signed commit in the actual repository...");
        // Ensure there are actual changes staged for commit
        await executeCommand('git commit -S -m "My first signed commit from Node.js in actual repo"');
        console.log("Commit command executed successfully.");

        console.log("Verifying the last commit's signature...");
        await executeCommand('git log -1 --show-signature');
        console.log("Signed commit verification output above.");

        // Optional: Push the changes to your remote repository
        console.log("Attempting to push changes...");
        await executeCommand('git push origin main'); // Replace <your_branch_name> with your branch (e.g., "dev1")
        console.log("Push command executed.");

    } catch (e) {
        console.error("An error occurred during Git operations:", e.message);
        process.exit(1); // Exit with error code if something goes wrong
    } finally {
        // In a real scenario, you might not delete the allowed_signers file if it's
        // a permanent part of your repository's setup. If it's truly temporary
        // for the script's run, you can uncomment this:
        // const allowedSignersFilePath = path.join(process.cwd(), ".git/allowed_signers");
        // if (existsSync(allowedSignersFilePath)) {
        //     unlinkSync(allowedSignersFilePath);
        //     console.log("Cleaned up temporary allowed_signers file.");
        // }
        console.log("Script finished.");
    }
}

// Ensure the script executes main when run
main();