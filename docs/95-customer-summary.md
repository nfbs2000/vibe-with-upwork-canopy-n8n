# Customer Summary: Canopy CRM File Upload Detection and Notifications

## 1. Overview
- Canopy sends an email when a file is uploaded or a request changes status
- n8n Gmail Trigger captures the email and parses client identifiers
- Determine whether a file/value exists
- Send email and Kakao Alimtalk when conditions are met

## 2. File upload detection approach
- The Public API spec has no file/document endpoints
- Canopy notification emails are used as the primary event signal
- Custom Fields are optional and can be used as an internal state gate
- If the customer provides a file API, we can switch to direct file lookup

## 3. Kakao Alimtalk delivery
- A personal Kakao API cannot send messages
- Business messaging policy requires a business channel and template approval
- Implementation uses the official provider SOLAPI REST API
  - Send API: `POST https://api.solapi.com/messages/v4/send-many/detail`
  - Auth: `Authorization` header (HMAC-SHA256)
  - Note: In tax workflows, email is often the primary channel; Kakao is optional for Korean clients.

## 4. Customer prerequisites
- Kakao business channel created and template approved
- `pfId` and `templateId`
- SOLAPI `API Key` / `API Secret`
- Sender number registered and approved
- Recipient phone number (from client profile or default config)

## 5. Items to confirm
- File detection basis: Canopy email notification vs custom field gate
- Recipient and sending criteria (e.g., latest file, filename pattern)
- SOLAPI usage or preference for another provider
- Email sender/subject patterns for Gmail filters
- Whether manual approval (Wait) is required before sending

## 6. Change options
- If a private file API exists, integrate it
- The provider can be swapped from SOLAPI to another vendor
