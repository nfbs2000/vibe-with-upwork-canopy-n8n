# Work Report

This document summarizes the n8n + Canopy Public API mock system delivered for Annie Kim.

## 1. Implementation summary
- Infrastructure: `docker-compose.yml` runs n8n and the mock server together
- API analysis:
  - No file/document endpoints in `specs/canopy-public-api-v3.yaml`
  - The "file or value" condition is determined by a Custom Field value
- n8n workflow:
  - Webhook receive -> client profile lookup -> Custom Field check -> Email/Kakao notification (SOLAPI)

## 2. Key files
- `docker-compose.yml`: container runtime config
- `canopy-crm-mock/index.ts`: Canopy CRM mock server logic
- `workflows/n8n-canopy-workflow.json`: n8n workflow template

## 3. Workflow logic
1. Call `GET /public/v3/clients/:id`
2. Check a target field in `custom_fields` (e.g., `File Upload Status`)
3. If the value is `Uploaded`, send Email/Kakao notification

## 4. n8n access check
- The n8n dashboard is reachable at `http://localhost:5678`

## 5. Next steps
- Translate workflow node names and mock data if desired
