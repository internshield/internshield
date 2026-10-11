# Neon project setup

The Neon config and example function files are checked into this directory:

- `neon.ts` — Neon config with auth enabled, a private `data-01` bucket, and an `api` function sourced from `hello.ts`.
- `hello.ts` — minimal smoke-test function returning `Hello from Neon Functions`.

## Run locally

Run these commands from `recruitment-platform/` in a local terminal where Node.js/npm and the Neon CLI are available:

```bash
npm i -g neon@latest
neon login
neon skills -y
neon mcp -y
neon link --project-id proud-credit-65232095 --branch production -y
neon config init
```

Review the generated config and ensure it matches the checked-in `neon.ts` before deploying. If `neon config init` overwrites or creates a different config path, preserve the settings above and avoid accidentally replacing the application package configuration.

Then deploy from the same project directory:

```bash
neon deploy
```

## Verify

After deployment, verify the Neon CLI reports a successful deployment and invoke the deployed `api` function to confirm the response is exactly:

```text
Hello from Neon Functions
```

## Important boundaries

- Linking uses project ID `proud-credit-65232095` and branch `production` as requested.
- Authentication and deployment require an authorized Neon CLI login in the actual terminal environment. Do not commit access tokens, connection strings, or other credentials.
- This config does not migrate any recruitment or intern-registration data.
- The existing InternShield portals, GoDaddy domain, Cloudflare DNS, Google Sheets, and Apps Script endpoints must remain unchanged during this setup.
- The Neon Functions example is a separate smoke test; it does not yet replace the Next.js recruitment API. Verify runtime compatibility and deployment outputs before routing traffic to it.
