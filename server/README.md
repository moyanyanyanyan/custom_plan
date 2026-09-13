# Card AI Proxy

```powershell
$env:STEPFUN_API_KEY = 'your-server-only-key'
node server/index.mjs
```

The client uses `VITE_AI_PROXY_URL` to reach this service. The StepFun key must never be placed in the client build.
