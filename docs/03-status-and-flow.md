# Status and Flow

## Status summary
- Docker Compose runs n8n + canopy-crm-mock.
- Mock server supports client profile lookups.
- The Public API spec has no file/document endpoints, so email notifications are used as event signals.
- The primary trigger is Canopy notification email (Email-to-Webhook).

## Implementation conclusion
- "Profile has a file" cannot be checked directly via the Public API.
- The current implementation uses Canopy email notifications as the trigger signal.

## Docker services
- n8n: http://localhost:5678
- canopy-crm-mock: http://localhost:3080

## Mock server endpoints
- `GET /public/v3/clients`
- `GET /public/v3/clients/:id`

## High-level flow (Mermaid)
```mermaid
flowchart LR
  subgraph docker_compose[Docker Compose]
    n8n[n8n\nhttp://localhost:5678]
    mock[canopy-crm-mock\nhttp://localhost:3080]
  end

  canopy[Canopy Email Notification] --> gmail[Gmail Trigger]
  gmail --> n8n
  n8n -->|"Parse email (client_id/email/name)"| n8n
  n8n -->|"HTTP Request (GET /clients/:id)"| mock
  mock -->|"{ client }"| n8n
  n8n --> wait[Wait (optional approval)]
  wait --> notify["Notify (Kakao/Email) via SOLAPI/SMTP"]
```

## Items to confirm
- How to detect "file uploaded" in production (file API vs Custom Field)
- Whether Custom Fields are used as an internal state gate
- Recipient and channel policy
- Email sender/subject patterns for filtering
- Whether manual approval (Wait) is required before sending
