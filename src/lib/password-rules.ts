/* Account input rules. Plain module, so client forms and the server share the same limits. */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  return null;
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;

export function usernameProblem(username: string): string | null {
  return USERNAME_PATTERN.test(username)
    ? null
    : "Usernames are 3–32 characters: letters, numbers, dot, dash or underscore.";
}
