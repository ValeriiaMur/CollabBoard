/**
 * Bot Authentication Utilities
 *
 * Generates and validates API keys for external bots
 * that want to join and interact with boards.
 */

import { randomBytes, createHash } from "crypto";

/**
 * Generate a random API key for a bot.
 * Format: cb_bot_<32 random hex chars>
 */
export function generateBotApiKey(): string {
  const bytes = randomBytes(16);
  return `cb_bot_${bytes.toString("hex")}`;
}

/**
 * Hash an API key for storage in Firestore.
 * Uses SHA-256 (no need for bcrypt since API keys are high-entropy).
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Verify an API key against a stored hash.
 */
export function verifyApiKey(apiKey: string, storedHash: string): boolean {
  const hash = hashApiKey(apiKey);
  return hash === storedHash;
}

/**
 * Generate an invite link for a bot.
 */
export function generateInviteLink(
  baseUrl: string,
  boardId: string,
  botId: string
): string {
  return `${baseUrl}/board/${boardId}?bot=${botId}`;
}
