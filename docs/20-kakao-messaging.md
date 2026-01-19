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
      "text": "Canopy update: Uploaded",
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
  - `Canopy_Solapi_Payload`: build Authorization and request body
  - `Canopy_Kakao_Notification`: call SOLAPI API

## Manual test button in n8n
For a quick demo, the workflow includes a manual trigger that sends a Kakao message immediately.

Steps:
1. Open the workflow in n8n.
2. Click **Execute workflow** (this runs the `Kakao_Manual_Button` trigger).
3. The message is sent using the same SOLAPI credentials.

The manual path uses `SOLAPI_TO` as the recipient unless a `to` value is provided in the `Kakao_Manual_Input` node.

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
- For tax workflows, email is often the primary channel; Kakao is optional when the client prefers it.

## Signup and send checklist
1. Create a Kakao Business Channel.
2. Create an Alimtalk template and wait for approval.
3. Create a SOLAPI account and verify the business.
4. Register the sender phone number in SOLAPI.
5. Copy `pfId` and `templateId` into environment variables.
6. Set `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_FROM`, and `SOLAPI_TO`.
7. Execute the manual trigger in n8n to verify delivery.
