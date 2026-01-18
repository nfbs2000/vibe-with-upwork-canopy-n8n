# Canopy Public API v3 Business Flow

## Purpose
Summarize the client/contact/custom field flow based on `specs/canopy-public-api-v3.yaml`.

## Key actors
- Tax firm staff (API caller)
- Client (individual or business)
- Contact (family or related party)

## Core data objects
- Client: individual or business client record
- Contact: related party linked to a client
- Custom Field: user-defined fields on client profiles

## API flow summary
### 1) Client lookup/sync
- `GET /public/v3/clients`
  - Pagination and incremental sync via `limit`, `next_cursor`, `updated_at`
- `GET /public/v3/clients/search`
  - Search by name/email/phone
- `GET /public/v3/clients/{client_id}`
  - Client details

### 2) Client create/update/delete
- `POST /public/v3/clients`
- `PATCH /public/v3/clients/{client_id}`
- `DELETE /public/v3/clients/{client_id}`

### 3) Contact create/update/delete
- `GET /public/v3/contacts`
- `GET /public/v3/contacts/search`
- `GET /public/v3/contacts/{contact_id}`
- `POST /public/v3/contacts`
- `PATCH /public/v3/contacts/{contact_id}`
- `DELETE /public/v3/contacts/{contact_id}`

### 4) Custom Field usage
- `GET /public/v3/custom_fields`
- Use `custom_fields` with field id + value on client create/update

## Business flow (text)
1. New client intake
   - Search; if not found, create a client
   - Link contacts (family/related parties)
   - Store tax metadata in Custom Fields
2. Operational updates
   - Sync changes by `updated_at`
   - Update status/tags/relationships

## File upload automation gap
- The Public API spec has no file/document endpoints
- If "file exists" is needed:
  - Check for a private API, or
  - Manage a Custom Field status instead
