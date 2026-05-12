# SpecHeal Kubernetes Deployment

SpecHeal deploys as one application container plus PostgreSQL. For the hackathon namespace, use the provided kubeconfig in the ignored infrastructure folder and deploy into `merge-kalau-berani`.

## Build Image

GitHub Actions builds and pushes the production image to GitHub Container Registry on every push to `main` after CI passes. No extra GitHub secret is needed for this image push because the workflow uses GitHub's built-in `GITHUB_TOKEN`.

Published tags:

```text
ghcr.io/antech2-async/specheal:production
ghcr.io/antech2-async/specheal:sha-<short-sha>
```

Manual fallback:

```bash
docker build -t ghcr.io/antech2-async/specheal:production .
docker push ghcr.io/antech2-async/specheal:production
```

The image uses the Playwright base image so Chromium and browser dependencies are available for runtime evidence capture and rerun proof.

If the GHCR package is private, Kubernetes needs an `imagePullSecret`. For the fastest hackathon path, either make the package public or create a pull secret in the `merge-kalau-berani` namespace.

## Configure Secrets

Copy `k8s/secret.template.yaml` to `k8s/secret.local.yaml`, replace the placeholder OpenAI, Jira token, and database password values, then apply it with the hackathon kubeconfig:

```bash
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" apply -f k8s/secret.local.yaml
```

The provided hackathon PostgreSQL service is external at `103.185.52.138:1185` and requires SSL with a self-signed certificate, so keep `sslmode=no-verify` in `DATABASE_URL` unless the organizers provide a CA certificate. `k8s/postgres.yaml` is optional fallback infrastructure and should be skipped for the team-provided database.

## Deploy App

Update the image in `k8s/app.yaml` to the GHCR image from the workflow, then apply:

```bash
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" apply -f k8s/app.yaml
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" rollout status deployment/specheal-app -n merge-kalau-berani
```

Or update the running deployment directly after the GHCR image is available:

```bash
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" set image deployment/specheal-app specheal=ghcr.io/antech2-async/specheal:production -n merge-kalau-berani
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" rollout status deployment/specheal-app -n merge-kalau-berani
```

## Verify Runtime

```bash
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" get pods -n merge-kalau-berani
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" logs deployment/specheal-app -n merge-kalau-berani
kubectl --kubeconfig="merge-kalau-berani 2/merge-kalau-berani/kubeconfig.yaml" port-forward service/specheal-app 3000:80 -n merge-kalau-berani
```

Open `http://merge-kalau-berani.hackathon.sev-2.com` or `http://localhost:3000` through port-forward and confirm the dashboard readiness cards show OpenAI, Jira, PostgreSQL, and Playwright as configured.

Latest deployed verification:

```text
Image: ghcr.io/antech2-async/specheal:sha-c794df0
Dashboard: http://merge-kalau-berani.hackathon.sev-2.com
Healthy Flow: completed, NO_HEAL_NEEDED, Jira not_required
Locator Drift: completed, HEAL, validation passed, rerun passed, Jira SH-14
Product Bug: completed, PRODUCT BUG, zero candidates, Jira SH-15
```
