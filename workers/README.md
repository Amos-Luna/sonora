# Sonora Workers

The MVP runs workers from the backend image:

```bash
uv run celery -A app.worker.celery_app worker --loglevel=INFO
```

This keeps API and worker contracts in one Python package while still deploying them as separate containers. Heavy analysis models should be added as dedicated worker images once GPU/CPU needs are known.
