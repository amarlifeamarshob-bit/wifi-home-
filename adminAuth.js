// Simple password gate for the admin panel, replacing the Claude.ai-only
// storageShim.adminSignIn(). The password is read from an environment
// variable so it isn't hard-coded in the repo — set it in a local .env file
// (see .env.example) and in Vercel's Project Settings > Environment Variables.
//
// Note: because this is a purely front-end site (no backend server), this
// password check happens in the browser — it stops casual visitors from
// opening the admin panel, but it is not the same level of security as a
// real server-side login. Don't reuse this password anywhere sensitive.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";

export async function adminSignIn(pass) {
  if (!ADMIN_PASSWORD) {
    // No password configured yet — fail closed rather than letting anyone in.
    console.error("VITE_ADMIN_PASSWORD is not set. See .env.example.");
    return false;
  }
  return pass === ADMIN_PASSWORD;
}
