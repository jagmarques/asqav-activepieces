# Asqav piece for Activepieces

Sign AI agent actions and verify the tamper-evident receipts that prove what each agent did. This repo holds the source of an [Activepieces](https://www.activepieces.com) community piece for [Asqav](https://asqav.com).

This piece is built and maintained by the Asqav team.

## Layout

The files under `packages/pieces/community/asqav/` are laid out so they copy 1:1 into a fork of [activepieces/activepieces](https://github.com/activepieces/activepieces) at the same path. The piece follows the shape of recently merged community pieces: `"type": "commonjs"`, `workspace:*` dependencies on `@activepieces/pieces-framework`, `@activepieces/pieces-common`, and `@activepieces/shared`, plus the standard `tsconfig.json`, `tsconfig.lib.json`, and `.eslintrc.json`.

A monorepo PR additionally needs, inside the fork:

1. A `tsconfig.base.json` path entry: `"@activepieces/piece-asqav": ["packages/pieces/community/asqav/src/index.ts"]` (alphabetical order).
2. A regenerated `bun.lock` (`bun install` at the repo root).

Lint and build only run inside their monorepo, since the piece configs extend the repo root:

```
npx turbo run lint build --filter=@activepieces/piece-asqav
```

## Actions

- **Sign Action**: signs an action with a named Asqav agent and returns the receipt, including the signature ID and a verification URL. The agent is reused when it already exists and created on first run. An optional Compliance Mode checkbox requests a policy-evaluated compliance receipt.
- **Verify Signature**: verifies a signed receipt by its signature ID and returns the verification result.
- **Custom API Call**: calls any Asqav API endpoint with the stored connection.

All cryptography happens server-side in the Asqav cloud. The piece is an HTTP client only, built on `@activepieces/pieces-common`'s `httpClient`.

## Authentication

The piece uses a single secret, your Asqav API key.

1. Create an API key at https://asqav.com.
2. In Activepieces, add a new connection for the Asqav piece.
3. Paste the API key into the API Key field.

The connection validates the key against the Asqav API when you save it and shows a readable error when the key is wrong. The key is stored as a secret by Activepieces and is sent only to the Asqav API.

## Error handling

Asqav API errors map to messages that say what to fix:

- 401: invalid API key, reconnect with a current key.
- 403: missing scope, suspended agent, or a content-scan block, with the server detail included.
- 412: compliance precondition failed, with the exact reason (no matching policy, or the organization requires compliance mode).
- 422: invalid step inputs, with the offending field named.
- 429: rate limit reached.

## License

MIT, see [LICENSE](LICENSE).
