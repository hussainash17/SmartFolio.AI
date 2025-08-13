# PMS Frontend API Client Update

To update `openapi.json` and regenerate the TypeScript client when the backend changes, run:

```bash
BACKEND_URL=http://localhost:8000 ../scripts/generate-pms-client.sh
```

This will:
- Download the live OpenAPI schema from `$BACKEND_URL/api/v1/openapi.json` into `pms-frontend/openapi.json`
- Regenerate the client in `pms-frontend/src/client` using `openapi-ts`

Notes:
- Ensure the backend is running and accessible at `BACKEND_URL`.
- You can add `VITE_API_URL` in `.env` to point the app to the backend at runtime.


