/**
 * Create an admin account, or reset an existing account's password and make it an admin.
 * Accounts are admin-created only, so this is how the first admin gets in.
 *
 * Usage: npm run user:admin -- <username> ["Display Name"]
 * The password is read from the KINGSOL_PASSWORD environment variable, or prompted for (hidden).
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { pool, query } from "../src/lib/db";
import { hashPassword, passwordProblem, usernameProblem } from "../src/lib/password";

function promptHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const [username, displayName] = process.argv.slice(2);
  if (!username) throw new Error('Usage: npm run user:admin -- <username> ["Display Name"]');
  const nameErr = usernameProblem(username);
  if (nameErr) throw new Error(nameErr);

  let password = process.env.KINGSOL_PASSWORD ?? "";
  if (!password) {
    password = await promptHidden(`Password for ${username}: `);
    const again = await promptHidden("Repeat password: ");
    if (password !== again) throw new Error("Passwords do not match.");
  }
  const pwErr = passwordProblem(password);
  if (pwErr) throw new Error(pwErr);

  const hash = await hashPassword(password);
  const rows = await query<{ id: string; inserted: boolean }>(
    `INSERT INTO users (username, display_name, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT ((lower(username))) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, role = 'admin',
           failed_logins = 0, locked_until = NULL, must_change_password = FALSE
     RETURNING id, (xmax = 0) AS inserted`,
    [username, displayName || username, hash],
  );
  await query("DELETE FROM sessions WHERE user_id = $1", [rows[0].id]);
  console.log(rows[0].inserted ? `Created admin "${username}".` : `Updated "${username}": now an admin with a new password.`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool().end());
