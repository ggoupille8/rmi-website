curl http://localhost:4321/api/healthz
Invoke-WebRequest http://localhost:4321/api/healthz | Select-Object StatusCode, Content
