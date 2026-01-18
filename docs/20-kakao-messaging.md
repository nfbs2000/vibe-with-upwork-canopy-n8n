# Kakao Alimtalk Messaging Integration (SOLAPI)

This project uses the SOLAPI REST API to send Kakao Alimtalk.

References
- https://developers.solapi.dev/references/messages/sendManyDetail
- https://developers.solapi.dev/references/kakao/
- https://developers.solapi.dev/references/authentication/api-key

## Key summary
- Send API: `POST https://api.solapi.com/messages/v4/send-many/detail`
- Auth: HMAC-SHA256 signature in the `Authorization` header
- Required for ATA: `messages.to`, `kakaoOptions.pfId`, `kakaoOptions.templateId`

## Authorization header format
```
Authorization: HMAC-SHA256 apiKey=<API Key>, date=<Date Time>, salt=<Salt>, signature=<Signature>
```

Signature rules (per docs)
- `signature = HMAC-SHA256(apiSecret, dateTime + salt)`
- `dateTime` must be ISO 8601
- `salt` is random 16-byte hex

## Request example (Alimtalk ATA)
```json
{
  "messages": [
    {
      "to": "01012345678",
      "from": "029302266",
      "type": "ATA",
      "text": "Profile value changed: Uploaded",
      "kakaoOptions": {
        "pfId": "PFXXXXXXXXXXXXXXXX",
        "templateId": "TEMPLATE_XXXXXXXX",
        "variables": {
          "status": "Uploaded"
        }
      }
    }
  ]
}
```

## n8n workflow location
- Workflow: `workflows/n8n-canopy-workflow.json`
- Nodes
  - `Build Solapi Payload`: build Authorization and request body
  - `Kakao Notification (Solapi)`: call SOLAPI API

## Required environment variables (n8n container)
- `SOLAPI_API_KEY`
- `SOLAPI_API_SECRET`
- `SOLAPI_PF_ID`
- `SOLAPI_TEMPLATE_ID`
- `SOLAPI_FROM`
- `SOLAPI_TO`
- `SOLAPI_TEMPLATE_TEXT` (optional, use exact template body)

## Notes
- Alimtalk templates must be approved in Kakao Business Center
- `variables` keys must match template variable names
- Sender number (`from`) must be registered and approved
- Recipient number is pulled from CRM `phones` (primary first), otherwise `SOLAPI_TO`
