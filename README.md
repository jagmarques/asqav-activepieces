# Asqav piece for Activepieces

Submit action data to [Asqav](https://asqav.com) for signing, and request hosted receipt verification from an Activepieces flow. The piece sends HTTP requests; it does not observe other steps, prevent their execution, or independently check signatures.

## Build and validate

Use Node.js 22.22.0 or newer. From this repository's root:

```sh
npm ci
npm run build
npm run lint
npm run coverage
npm run package
npm run test:package
```

The piece stays under `packages/pieces/community/asqav/`. The root workspace supplies its TypeScript configuration and lockfile. It uses the published `@activepieces/pieces-framework` 0.32.0 and matching `@activepieces/shared` 0.95.1, with context version 2. The framework declares a minimum host release of 0.82.0.

Tests load the real framework definition and execute its actions using the framework's `createMockActionContext`, with HTTP fixtures. The package check installs the built tarball with normal dependency resolution and executes its exported actions. These checks cover the piece and its framework boundary; they do not run an Activepieces editor or server. For host installation, follow [Activepieces' piece management instructions](https://www.activepieces.com/docs/admin-guide/guides/manage-pieces). This repository does not establish publication in the Activepieces catalog.

`npm run package` writes a tarball under `dist/`, including the compiled CommonJS entry point, declarations, README and license. No SDK is used.

## Actions and data handling

- **Sign Action** sends the action type and full Context object to Asqav. It reuses an exact-name agent in the first 50 non-revoked search results, or requests a new ML-DSA-65 agent. This search is not a uniqueness or concurrency guarantee. The step returns the signing API response; an API refusal raises an error and yields no receipt from this step.
- **Verify Signature** sends the signature identifier to the hosted verification endpoint and returns its response, including a negative verdict. It does not perform offline verification.
- **Custom API Call** sends a JSON request to an endpoint under `https://api.asqav.com/api/v1`. It returns `{ status, headers, body }` for a successful response and raises an error for other HTTP statuses.

The Sign Action's Context is sent in full, with `{}` when omitted or null. This integration does not implement SDK capture modes, so setting `ASQAV_MODE` does not change that behavior. An optional Compliance Mode checkbox adds `compliance_mode: true`; the server decides whether its policy requirements are met. The piece does not guarantee that another workflow step ran or that its outcome matches the submitted data.

Custom API Call accepts an API-relative path such as `/agents`, or a full URL within the fixed API prefix. Methods are GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS. Headers and query parameters must be objects with string values. Select JSON and set its body to send JSON; select None to send no body. The action retains the `custom_api_call` name and URL, method, header, query and JSON input fields. Non-JSON bodies, binary responses, redirects, ignored HTTP failures and configurable timeouts are unsupported and rejected. Flows using those options must be adjusted before using this build.

All requests use certificate-verified HTTPS with a 30-second deadline. The piece does not follow redirects. Connection credentials supply `X-API-Key`; custom headers cannot replace that header, Host or Content-Length. Requests to another origin, outside the API prefix, or with URL credentials or fragments are rejected before sending the key.

## Authentication and errors

Create an Asqav API key and add it as the piece's API Key connection. Connection validation requests `/agents?limit=1`. A failed probe can mean an invalid key, insufficient agent-list permission or an unavailable service; it does not identify which condition occurred.

HTTP errors include messages for rejected keys (401), refused requests or content scanning (403), compliance preconditions (412), rejected payloads (422), and rate limits (429). Network failures and non-JSON responses also fail the step. A failed verification request is distinct from a successful request whose returned verdict is negative.

## License

[Elastic License 2.0](LICENSE).
