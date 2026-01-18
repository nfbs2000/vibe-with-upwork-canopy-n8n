# Requirements Summary

## Goal
When n8n receives a webhook, check the client profile in Canopy Tax CRM and send a notification if a file or specific value exists.

## Core flow
1. n8n receives a webhook.
2. A script connects to Canopy Tax CRM and checks the client profile.
3. If a file or value exists, fetch that value.
4. Send a "file exists" signal back to n8n.
5. Wait for an additional signal from n8n, then send KakaoTalk or email.

## Inputs/Outputs
- Input: n8n webhook, client identifier (e.g., client_id)
- Output: file-exists flag, value, notification result

## Items to confirm
- Whether "file" can be queried via the Public API
- Whether "value" means a Custom Field
- Final recipient (client vs agent) and notification channel
