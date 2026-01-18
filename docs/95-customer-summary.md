# Customer Summary: Canopy CRM File Upload Detection and Notifications

## 1. Overview
- n8n receives a webhook
- Query the Canopy CRM client profile
- Determine whether a file/value exists
- Send email and Kakao Alimtalk when conditions are met

## 2. File upload detection approach
- The Public API spec has no file/document endpoints
- Currently detect uploads via a Custom Field value
  - Example: `File Upload Status` = `Uploaded`
- If the customer provides a file API, we can switch to direct file lookup

## 3. Kakao Alimtalk delivery
- A personal Kakao API cannot send messages
- Business messaging policy requires a business channel and template approval
- Implementation uses the official provider SOLAPI REST API
  - Send API: `POST https://api.solapi.com/messages/v4/send-many/detail`
  - Auth: `Authorization` header (HMAC-SHA256)

## 4. Customer prerequisites
- Kakao business channel created and template approved
- `pfId` and `templateId`
- SOLAPI `API Key` / `API Secret`
- Sender number registered and approved
- Recipient phone number (from client profile or webhook input)

## 5. Items to confirm
- File detection basis: file API or Custom Field value
- Recipient and sending criteria (e.g., latest file, filename pattern)
- SOLAPI usage or preference for another provider

## 6. Change options
- If a private file API exists, integrate it
- The provider can be swapped from SOLAPI to another vendor
