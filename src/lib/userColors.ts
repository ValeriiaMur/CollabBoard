/**
 * Predefined user colors for presence indicators and cursors.
 * Deterministically maps a user ID to a color so each user
 * always gets the same color across sessions.
 */
const USER_COLORS = [
  "#E57373", // red
  "#81C784", // green
  "#64B5F6", // blue
  "#FFB74D", // orange
  "#BA68C8", // purple
  "#4DD0E1", // cyan
  "#FF8A65", // deep orange
  "#AED581", // light green
  "#7986CB", // indigo
  "#F06292", // pink
];

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}
