# Standard Operating Procedure (SOP): File Upload Detection & Notification

## 1. Overview
Currently, the Canopy Tax CRM Public API **does not support automatic webhooks** for file upload events.
To bridge this gap, this SOP uses **Email-to-Webhook**: Canopy sends an email, and n8n triggers from the Gmail inbox. This document defines the standard procedure for this process.

## 2. Prerequisites (One-Time Setup)

### 2.1 Enable Email Notifications
All Tax Preparers/Staff must enable the following setting in their Canopy account:

1.  Log in to Canopy.
2.  Go to **Settings** > **Notifications**.
3.  Check the **Email** box for the **Client uploads a file** option.
    *   (Optional) Enabling **Mobile Push** is also recommended for faster response times.

### 2.2 Connect Gmail to n8n
Ensure the Gmail inbox that receives Canopy notifications is connected to n8n (Gmail Trigger).

### 2.3 Optional: Custom Field
If the firm wants an internal status flag, create a Custom Field:

*   **Field Name**: `File Upload Status`
*   **Options**: `Pending` (Default), `Uploaded`, `Review Completed`

## 3. Daily Routine

### Step 1: Receive Notification (Trigger)
*   When a client uploads a file, you will receive an email (and/or push notification) with the subject **"New File Uploaded"**.

### Step 2: Manual Review (Optional Approval)
1.  Click the **[View Client]** link or the file link within the email notification to open the client's profile in Canopy.
2.  Briefly verify that the file has been uploaded correctly.
3.  If approval is required, click the internal approval link (n8n resume URL).

### Step 3: Automation (System)
*   Within a few minutes of the Canopy email arriving in the monitored Gmail inbox (and approval if enabled), the **n8n automation system** performs the following:
    1.  **Client Notification**: Sends a "Document Received" confirmation via KakaoTalk/SMS.
    2.  **Internal Logging**: Records the event in the internal tracking sheet (Excel/Google Sheets).

## 4. Scope of Responsibility & Confirmation
To ensure the successful operation of this workflow, clearly define the boundaries between the **Automated System (n8n)** and the **Manual Process (Staff)**.

### 4.1. The "Gap" in Automation
*   **What n8n CAN do**: Automatically send messages, log data, and process information *after* it receives a signal.
*   **What n8n CANNOT do**: Automatically detect a file simply sitting in Canopy without a signal (due to API limitations).
*   **The Bridge**: The **Canopy email notification** acts as the external signal.

### 4.2. Process Agreement
By adopting this workflow, the firm acknowledges that:
1.  [ ] **Staff Responsibility**: It is the explicit responsibility of staff to review email notifications and approve when required.
2.  [ ] **No Auto-Trigger**: The system will **NOT** trigger if Canopy does not send an email notification.
3.  [ ] **SOP Compliance**: All relevant staff members have been trained on this Standard Operating Procedure.

## 5. Summary Table
| Actor | Role | Classification |
| :--- | :--- | :--- |
| **Canopy** | Sends email to staff when file is uploaded | System (Built-in) |
| **Staff** | Reviews email & approves if required | **MANUAL PROCESS (External to n8n)** |
| **n8n** | Parses email & sends client notification | System (Automated) |
