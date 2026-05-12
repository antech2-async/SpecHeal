# SpecHeal Kubernetes Deployment

SpecHeal deploys as one application container plus PostgreSQL. For the hackathon namespace, use the provided kubeconfig in the ignored infrastructure folder and deploy into `merge-kalau-berani`.

## Build Image

```bash
docker build -t ghcr.io/your-org/specheal:latest .
docker push ghcr.io/your-org/specheal:latest
```

The image uses the Playwright base image so Chromium and browser dependencies are available for runtime evidence capture and rerun proof.

## Configure Secrets

Copy `k8s/secret.template.yaml` to `k8s/secret.local.yaml`, replace the placeholder OpenAI, Jira token, and database password values, then apply it with the hackathon kubeconfig:

```bash
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" apply -f k8s/secret.local.yaml
```

The provided hackathon PostgreSQL service is external at `103.185.52.138:1185`, so `k8s/postgres.yaml` is optional fallback infrastructure and should be skipped for the team-provided database.

## Deploy App

Update the image in `k8s/app.yaml`, then apply:

```bash
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" apply -f k8s/app.yaml
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" rollout status deployment/specheal-app -n merge-kalau-berani
```

## Verify Runtime

```bash
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" get pods -n merge-kalau-berani
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" logs deployment/specheal-app -n merge-kalau-berani
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" port-forward service/specheal-app 3000:80 -n merge-kalau-berani
```

Open `https://merge-kalau-berani.hackathon.sev-2.com` or `http://localhost:3000` through port-forward and confirm the dashboard readiness cards show OpenAI, Jira, PostgreSQL, and Playwright as configured.
