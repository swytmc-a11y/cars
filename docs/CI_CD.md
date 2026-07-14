# CI/CD without GitHub

This repository is intentionally standalone and does not require a GitHub repository, GitHub Actions, or any GitHub-specific service.

## Local CI entrypoint

Run the same checks from any terminal, self-hosted runner, GitLab CI, Bitbucket Pipelines, Jenkins, Buildkite, Railway, Render, or a private deployment server:

```bash
./scripts/ci.sh
```

The script performs:

1. Backend dependency installation.
2. TypeScript compilation.
3. Backend test execution.
4. Flutter dependency installation and tests when the Flutter SDK exists on the runner.

## Deployment options

- Docker Compose: `docker compose up --build`
- Railway: `deploy/railway/railway.json`
- Render: `deploy/render/render.yaml`
- Any container platform that can build `services/api/Dockerfile`

## Example GitLab CI adapter

```yaml
stages: [test]
ci:
  image: node:20
  stage: test
  script:
    - ./scripts/ci.sh
```
