# SpecHeal Kubernetes Deployment

SpecHeal deploys as one application container plus a PostgreSQL service.

## Build Image

```bash
docker build -t ghcr.io/your-org/specheal:latest .
docker push ghcr.io/your-org/specheal:latest
```

The image uses the Playwright base image so Chromium and browser dependencies are available for runtime evidence capture and rerun proof.

## Configure Secrets

Copy `k8s/secret.template.yaml`, replace the placeholder OpenAI and Jira values, update `NEXT_PUBLIC_BASE_URL`, then apply it:

```bash
kubectl apply -f k8s/app.yaml
kubectl apply -f k8s/secret.template.yaml
kubectl apply -f k8s/postgres.yaml
```

If using an external PostgreSQL service, keep `specheal-secrets` but replace `DATABASE_URL` and skip `k8s/postgres.yaml`.

## Deploy App

Update the image in `k8s/app.yaml`, then apply:

```bash
kubectl apply -f k8s/app.yaml
kubectl rollout status deployment/specheal-app -n specheal
```

## Verify Runtime

```bash
kubectl get pods -n specheal
kubectl logs deployment/specheal-app -n specheal
kubectl port-forward service/specheal-app 3000:80 -n specheal
```

Open `http://localhost:3000` and confirm the dashboard readiness cards show OpenAI, Jira, PostgreSQL, and Playwright as configured.
