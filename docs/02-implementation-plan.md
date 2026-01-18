# Implementation Plan

## Purpose
Integrate n8n with Canopy Tax CRM to check client profile status (file uploaded or value set) and send a notification when conditions are met.

## Infrastructure
- Run n8n and the mock server together with `docker-compose.yml`
- Services
  - n8n: http://localhost:5678
  - canopy-crm-mock: http://localhost:3080

## API access strategy
- Based on `specs/canopy-public-api-v3.yaml`, there are no file/document endpoints
- Therefore "file exists" is determined by a Custom Field value
  - Example: `File Upload Status` = `Uploaded`

## Mock server design
- Location: `canopy-crm-mock/`
- Express (TypeScript)
- Endpoints
  - `GET /public/v3/clients`
  - `GET /public/v3/clients/:id`
- Responses include `custom_fields`

## n8n workflow design
- Template: `workflows/n8n-canopy-workflow.json`
- Flow
  1. Receive webhook
  2. HTTP Request to fetch client profile
  3. IF node checks Custom Field value
  4. If matched, send Email/KakaoTalk
  5. Optionally add Wait/Resume for a "second signal"

## Notification channels
- Email: SMTP/Gmail node
- Kakao: SOLAPI REST API (`/messages/v4/send-many/detail`)
  - HMAC-SHA256 Authorization header required
  - Alimtalk (ATA) template approval and pfId/templateId required

## Validation plan
- Trigger n8n webhook via curl
- Change mock server custom_fields values and verify branching
- Confirm actual email/Kakao delivery
