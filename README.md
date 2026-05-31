# Asqav piece for Activepieces

Stop a rogue agent before it acts, and prove what it tried. An
[Activepieces](https://www.activepieces.com) piece that sends an action to an
[Asqav](https://asqav.com) agent for a policy decision: a permitted action returns a
signed receipt, and a denied action is refused server-side with a forensic record of
the attempt. Either way you get a tamper-evident, verifiable record of the step.

This piece is built and maintained by the Asqav team.

## What it does

The piece exposes a single action, Sign Action. At run time it:

1. Initialises the Asqav SDK with your API key.
2. Creates an Asqav agent named `activepieces`.
3. Signs the supplied action and returns the receipt.

All cryptography happens server-side in the Asqav cloud. The piece is an HTTP client only.

## Action: Sign Action

Properties:

- Action Type (Short Text, required): namespaced action identifier to sign, for
  example `api:call` or `email:send`.
- Context (JSON, optional): a JSON object of non-sensitive metadata to bind into
  the receipt.

Returns the Asqav `SignatureResponse`, including:

- `signatureId`: identifier of the signed record.
- `signature`: the signature value.
- `actionId`: identifier of the signed action.
- `timestamp`: signing time.
- `verificationUrl`: URL to verify the receipt.

## Authentication

This piece uses a single secret, your Asqav API key.

1. Create an API key at https://asqav.com.
2. In Activepieces, add a new connection for the Asqav piece.
3. Paste the API key into the Asqav API Key field.

The key is stored as a secret by Activepieces and is sent only to the Asqav API.

## Development

```
npm install
npm run build
npm test
```

`npm test` runs the unit test for the action with the Asqav SDK mocked, so no
network calls are made.

## License

MIT
