# Requirements Summary

## Goal
n8n listens to Canopy notification emails (Email-to-Webhook) and sends a notification if a file or specific value exists in the client profile.

## Core flow
1. Canopy sends an email when a client uploads a file or a request status changes.
2. n8n Gmail Trigger detects the email.
3. Parse the email to extract client identifiers (ID/email/name).
4. Fetch the client profile (for contact info and optional status checks).
5. Send KakaoTalk or email (optionally gated by a Custom Field).

## Inputs/Outputs
- Input: email event, parsed client identifier
- Output: detection result, notification result

## Items to confirm
- Email sender and subject patterns used by Canopy
- Whether a Custom Field will be used as a final gate (optional)
- Final recipient (client vs agent) and notification channel
