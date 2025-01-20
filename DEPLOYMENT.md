# DEPLOYMENT.md

## Overview

This document provides a high-level description of the flow of events in the release and production pipeline for ZKsync Portal. It outlines the processes for preview, staging, and production deployments, as well as the role of automated and manual steps in ensuring quality and reliability.

---

## Release and Deployment Workflow

### 1. Pull Request Creation

When a feature or bug fix is ready for review:

- A **Pull Request (PR)** is opened.
- The PR undergoes **code review** to ensure compliance with standards and to verify that the changes maintain the core functionality of the portal.
- A **preview deployment** is triggered automatically for the PR. This creates a live, temporary environment that reflects the proposed changes.
  - The preview deployment URL is shared for validation and testing.
  - The environment is configured to expire after 7 days to prevent resource waste.

### 2. Merge to Main

Once the PR is approved and tests have passed:

- The PR is merged into the `main` branch.
- An automated workflow:
  - Deploys the merged changes to the **staging environment**.
  - Assigns a new semantic version number to the release using `semantic-release`.
- The staging environment allows for integration testing and broader validation of the changes.

### 3. Staging Validation

After deployment to staging:

- **Testing**: Testing is conducted to ensure key user flows are functioning as expected.
- **Validation**: Maintainers verify the functionality and performance of the changes in the staging environment.
- **Feedback**: Any identified issues are addressed through additional PRs that follow the same workflow as described above.

### 4. Production Deployment

Once changes in staging are validated:

- A **manual trigger** initiates the production deployment workflow via the `Deploy Package to Production` workflow.
  - This ensures that no changes are deployed to production without explicit approval.
- The production deployment:
  - Builds and deploys the application to the live environment.
  - Utilizes the `live` channel in the Firebase project `zksync-dapp-wallet-v2`.

**Hotfixes**: Urgent fixes bypass the standard pipeline but follow a similar process:

- A PR is created and reviewed.
- After approval, it is merged and deployed directly to production using a manual trigger.

---

## Deployment Environment Overview

| Environment  | Purpose                               | Deployment Trigger     | Expiration  |
|--------------|---------------------------------------|------------------------|-------------|
| **Preview**  | Temporary environment for PR testing | Automatic on PR open   | 7 days      |
| **Staging**  | Integration testing and validation   | Automatic on merge     | N/A         |
| **Production**| Live environment for end users       | Manual trigger         | N/A         |

---

## Versioning and Release Management

- **Semantic Versioning**: All releases adhere to semantic versioning (`<major>.<minor>.<patch>`).
- **Version Assignment**: New versions are assigned automatically during the staging deployment workflow via `semantic-release`.
- **Release Notes**: Automatically generated and attached to each versioned release in GitHub.
