# Implementation Plan

## Purpose
Integrate n8n with Canopy Tax CRM using Email-to-Webhook signals and send notifications when conditions are met.

## Infrastructure
- Run n8n and the mock server together with `docker-compose.yml`
- Services
  - n8n: http://localhost:5678
  - canopy-crm-mock: http://localhost:3080

## API access strategy (Tax CRM)
- Based on `specs/canopy-public-api-v3.yaml`, there are no file/document endpoints.
- Therefore "file exists" is inferred from Canopy email notifications.
- Custom Fields are optional for internal status tracking.

## Email-to-Webhook strategy
- Enable Canopy email notifications for “New file uploaded” or request status changes.
- Use n8n Gmail Trigger with filters (sender + subject keywords).
- Parse the email body to extract `client_id`, email, or name.
- If needed, use `GET /public/v3/clients/search` to resolve client ID.
- Fetch `GET /public/v3/clients/:id` to obtain contact info.
- Optionally use `custom_fields` as a final gate.

## Fallback (optional)
- If email signals are not reliable, use scheduled polling with `updated_at` as a fallback.

## Mock server design
- Location: `canopy-crm-mock/`
- Express (TypeScript)
- Endpoints
  - `GET /public/v3/clients`
  - `GET /public/v3/clients/search`
  - `GET /public/v3/clients/:id`
- Responses include `custom_fields`

## n8n workflow design (Tax CRM path)
- Template: `workflows/n8n-canopy-workflow.json`
- Flow
  1. Gmail Trigger receives Canopy notification email
  2. Parse email for client identifiers
  3. Resolve client profile (direct ID or search)
  4. Optional approval wait
  5. Send Email/KakaoTalk

## Notification channels
- Email: SMTP/Gmail node
- Kakao: SOLAPI REST API (`/messages/v4/send-many/detail`)
  - HMAC-SHA256 Authorization header required
  - Alimtalk (ATA) template approval and pfId/templateId required

## Validation plan
- Send a test Canopy email to the Gmail inbox
- Verify parsing extracts the correct client identifier
- Confirm actual email/Kakao delivery
