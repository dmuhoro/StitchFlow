# 2026-11-08 — Local Vercel preview blocked E2E

## Step

Start the pulled production artifact with the requested command:

```sh
vercel preview --port 4174
```

## Observed result

The command exited with code 2. Vercel CLI 65.12.1 returned:

```text
Vercel CLI 65.12.1
{
  "status": "error",
  "reason": "unknown_command",
  "message": "Unknown command \"preview\". Did you mean \"remove\"?",
  "hint": "Accepted commands: ...",
  "cliVersion": "65.12.1"
}
```

The CLI's accepted-command hint did not include `preview`. Invocation metadata is omitted.
The follow-up readiness probe also failed:

```text
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:4174/ -o /dev/null -w 'HTTP %{http_code}\n'
curl: (7) Failed to connect to 127.0.0.1 port 4174 after 0 ms: Could not connect to server
HTTP 000
```

## Verdict

**BLOCKED — E2E was not run.** No Playwright tests, screenshots, or trace files were produced
because the requested preview command is unsupported by the installed Vercel CLI. Per the
stop-on-first-failure instruction, no alternate server command, backup/restore, live booking,
release update, tag, or push was attempted.

No `.env.pilot` values or credentials were loaded into the failed preview attempt or written to
this evidence.
