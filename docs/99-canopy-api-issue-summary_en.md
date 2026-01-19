# **Canopy Tax CRM API Automation & n8n-Solapi Integration for Document Detection: A Technical Report**

Editor note: Key conclusions from this report are reflected in `docs/02-implementation-plan.md`.

The digital transformation of the tax and accounting industry is evolving beyond simple data digitization to automating client interactions and minimizing workflow delays. Canopy Tax CRM has established itself as a core solution in the market, providing powerful document management and customer relationship management capabilities. However, when firms attempt to build their own custom workflows using Canopy's external API, they often encounter technical barriers due to the system's closed nature and limited data scope. In particular, real-time detection of client file uploads and connecting this event to external communication networks requires a complex architecture that cannot be solved by simple API calls alone. This report provides a precise analysis of the technical specifications and limitations of the Canopy Public API v3 and proposes a detailed "Custom Field State Machine" strategy and n8n's asynchronous wait mechanism to overcome these challenges. Furthermore, considering the specifics of the Korean market, it describes a system that integrates Solapi for Kakao Alimtalk notifications, establishing a seamless communication infrastructure between tax agents and clients.

## **Structural Characteristics of Canopy Tax Public API v3 and Technical Limitations of File Management**

The ecosystem of Canopy Tax CRM is largely divided into an internal workspace via the User Interface (UI) and a Public API v3 for external system integration. In the internal workspace, an advanced Document Management System (DMS) operates, including signature detection and OCR functions, demonstrating powerful handling capabilities for various extensions like TIFF, PDF, and Excel. However, the Public API v3 provided for external developers maintains a strictly limited data scope in contrast. The API's main endpoints focus on client basic information, contact details, client status (Prospect, Active, Inactive, Archived), and business type classification.

The most critical limitation is the absence of file and document endpoints. A technical review of the Public API v3 specifications confirmed that there is **no direct API call method to retrieve a list of files uploaded to a specific client's profile or to check for the existence of files**. Additionally, an outbound webhook function that delivers real-time events of new file uploads to external systems is not officially supported. This means that the direct path for external automation tools like n8n or Zapier to recognize the action "user uploaded a file" is blocked. Furthermore, sensitive financial data such as Accounts Receivable (AR) is also excluded from the API access scope, making workaround strategies essential for full-scale automation to resolve data opacity.

| Category | Supported Features & Data | Unsupported Limitations |
| :--- | :--- | :--- |
| **Basic Data** | Client Name, DOB, Phone, Email, Address | No access to account-level financial data (AR) |
| **Identifiers** | Client GUID, External ID | API usage restrictions on CRM 1 version accounts |
| **Status Mgmt** | Client Status & Business Type Classification | Absence of real-time status change webhooks |
| **Extensibility** | Supports Custom Fields | **No API endpoints for file listing or downloading** |
| **Task Mgmt** | Create client requests & tasks within UI | No API control for Tasks and Requests |

These constraints arise because Canopy's architecture is strictly based on data security and Role-Based Access Control (RBAC). All API requests must be performed over HTTPS and undergo strict verification via token-based authentication or system account keys (UUID). Therefore, for high-security information like document data, indiscriminate access via API is blocked, and it is designed to be processed limitedly only through internal system Automation Rules.

## **Document Detection Workaround Strategy Based on Custom Field State Machine**

The technical solution to resolve the absence of file lookup functionality in the Canopy API is to leverage the CRM's extensibility model, 'Custom Fields'. This involves creating a user-defined field such as `File_Upload_Status` or `Upload_Flag` in the client profile and using it as a 'Status Proxy' that the automation system can monitor. In the email-triggered design, Custom Fields are optional and can be used as an internal state gate.

The first step in implementing the state machine is to define a Custom Field of type 'Dropdown Select' or 'Text Input' in the Canopy settings menu. Using a dropdown type is advantageous for maintaining data integrity as it allows defining clear state transitions like 'Pending', 'Uploaded', 'Review Completed'. After a client submits materials via the portal UI or a tax agent manually uploads a file, this field value is changed to 'Uploaded' according to internal processes. While it would be ideal if Canopy's internal automation rules could automatically update the custom field upon detecting the completion of a specific document request (Client Request), current system specifications suggest this is likely to involve manual operation by staff or indirect updates following internal status changes.

n8n can periodically poll client data via `GET /public/v3/clients/{id}` calls or use the 'Watch Updated Clients' module to track profile changes. At this time, it parses the `custom_fields` array within the returned JSON object to check if the value of a specific field meets the target condition. This approach allows acquiring the business logic signal that "a document exists" without accessing the actual file binary.

| Field Component | Setting Value & Type | Role in Automation Logic |
| :--- | :--- | :--- |
| **Field Name** | `File_Upload_Status` | Unique identifier for n8n search and filtering |
| **Data Type** | Dropdown Select | Prevents errors by fixing status values (Pending, Uploaded, Done) |
| **Target** | Individual / Business Clients | Standardized application to company-wide client data model |
| **Access Rights** | Team Member / Admin | Prevents arbitrary modification of data and ensures reliability |

The key insight of this workaround strategy lies in substituting an 'Event' not provided by the API with a change in 'State'. This lowers the coupling between systems while providing the flexibility to migrate logic with minimal modifications when Canopy officially releases file-related APIs in the future.

## **n8n Email-Triggered Orchestration**

n8n serves as the central control unit connecting Canopy CRM and the external notification system, using **Canopy notification emails as the event signal**. Since Canopy Public API v3 does not provide outbound webhooks, Email-to-Webhook is the most practical trigger.

The workflow follows this chain. A **Gmail Trigger** detects Canopy notification emails. An **Email Parse** node extracts `client_id`, email, or name from the message. If needed, `GET /public/v3/clients/search` resolves the client ID, followed by `GET /public/v3/clients/:id` to retrieve contact details. Notifications are then sent, with an optional **Wait** node for manual approval.

This approach reduces API load and reacts faster than periodic polling, but depends on stable email formats and filters.

| n8n Node Function | Detailed Settings & Usage | Contribution to Business Logic |
| :--- | :--- | :--- |
| **Gmail Trigger** | sender/subject filters | Email-based event trigger |
| **Email Parse** | Extract identifiers | Client matching input |
| **Search (optional)** | `GET /clients/search` | Resolve client ID |
| **HTTP Request (Detail)** | `GET /clients/:id` | Fetch custom fields per client |
| **Wait (optional)** | Approval gate | Human-in-the-loop control |
| **Notification** | Solapi/Email | Sends client/staff alerts |

In a distributed setup (Queue Mode), ensure Gmail trigger state and approval waits are stored in a shared database to avoid duplicate or missed executions.

## **Kakao Alimtalk & Multi-Channel Notification System via Solapi Integration**

Once verified data and approval signals are ready, the process enters the final stage of delivering notifications to customers or staff. In the Korean business environment, Kakao Alimtalk is a channel that shows higher open rates than email and ensures reliability. Solapi acts as a communication gateway helping to easily send these KakaoTalk-based notification messages via REST API. Alimtalk can only send informational messages and has a policy characteristic that only pre-approved templates by Kakao can be used.

Integration with Solapi in the n8n workflow is achieved once again through the 'HTTP Request' node. The sending endpoint is `https://api.solapi.com/messages/v4/send-many/detail`, and the request body contains a JSON object with the recipient number, sender number, and variable values defined in the template. In particular, Solapi supports a 'Fail-over' feature that automatically switches to general SMS or LMS to resend the message if Alimtalk delivery fails, offsetting the uncertainty of the communication environment.

When sending based on templates, it is important to note that data acquired from Canopy must exactly match the variable format of Solapi. For example, to include the client's name or the type of uploaded document in the Alimtalk content, n8n's Expression feature must be used to map data to the appropriate location within the JSON structure. Also, to comply with night-time sending restriction policies (e.g., 08:00~21:00 restriction for FriendTalk), designing logic to determine the time and adjust the message sending timing using n8n is recommended.

```json
{  
  "messages": [  
    {  
      "to": "01012345678",  
      "from": "021234567",  
      "text": "[Daebak Tax Firm] Hello, customer Hong Gil-dong. The income tax documents you requested have been successfully received.",  
      "kakaoOptions": {  
        "pfId": "KA01PF210512032115",  
        "templateId": "UPLOAD_NOTIFY_V1",  
        "variables": {  
          "#{Name}": "Hong Gil-dong",  
          "#{DocumentName}": "Income Certificate"  
        }  
      }  
    }  
  ]  
}
```

This multi-channel notification system goes beyond simply delivering information; it enhances the professionalism of the service by sharing the progress of work with customers in real-time. If email notifications are needed, n8n's 'Send Email' node can be used to send customized HTML emails via SMTP or Gmail API integration. Unlike Canopy's internal email function which has limitations on template modification, email sending via n8n has the advantage of being able to unlimitedly combine external databases or results from previous nodes.

## **System Operational Stability & Security Architecture Optimization**

For the automation system to operate stably in a practical environment, fine-tuning at the infrastructure level must be supported. Both Canopy API and Solapi apply Rate Limits, so care must be taken to avoid unnecessary API bursts after each email trigger. For Canopy, request limits of 50 per 24 hours may apply for certain authentication methods, and exceeding this may return `429 Too Many Requests` or system error codes. Therefore, n8n should minimize API calls and use 'Retry on Fail' for transient errors.

In terms of security, management of API Keys, Secret Keys, and Gmail access is the top priority. n8n safely encrypts and stores this sensitive information separately from workflow logic through its Credentials management feature. Apply 2FA/app passwords for Gmail and restrict n8n UI/network access via VPN or firewall rules.

| Security Element | Applied Technology & Method | Effect |
| :--- | :--- | :--- |
| **Credential Protection** | n8n Credentials Encryption | Prevents API key leakage & centralized management |
| **Access Control** | n8n UI access control & network restrictions | Blocks unauthorized access |
| **Data Integrity** | HMAC Signature Verification | Verifies request authenticity & prevents tampering |
| **Execution Isolation** | n8n Queue Mode + Persistent DB | Maintains stable state in high-load environments |
| **Audit Trail** | n8n Execution History & Logs | Enables cause analysis & history check upon failure |

From a performance optimization perspective, it is more efficient to target only necessary client IDs when calling Canopy's `GET /clients` rather than fetching large amounts of data at once. If managing thousands of clients, building an event-based trigger using Canopy's 'Watch Updated Clients' feature to receive only changed data instead of querying all data every time is the way to drastically reduce system load.

## **Future of Tax Service Automation and Advancement Direction**

Canopy Tax CRM is currently accelerating AI-based innovation, which is expected to have a significant impact on future automation architectures. Recently announced 'Smart Prep' and 'Smart Intake' provide features where AI automatically matches customer answers with uploaded documents and updates checklists. If these features are advanced and exposed as external APIs, the current custom field workaround strategy could evolve into a method of directly receiving 'completion signals' generated by AI.

Furthermore, combining n8n's AI Agent nodes can allow AI to perform the manual approval steps of administrators. For example, it is possible to build a self-healing workflow where AI analyses the filenames of uploaded documents to determine if they are mandatory, and automatically sends a request for supplementation to the customer before sending the final notification if content is missing. This signifies an expansion from automation as a simple 'signal carrier' to an 'intelligent assistant' aiding the judgment process of tax agents.

In conclusion, the API limitations of Canopy Tax CRM can be sufficiently overcome through n8n's asynchronous design and the extension tool called Custom Fields. The flexible architecture built in the process of solving technical barriers will serve as a foundation for rapidly responding to future platform feature expansions. The notification system completed through integration with Solapi will maximize customer experience and innovatively improve the operational efficiency of tax firms, acting as a powerful differentiator in the increasingly competitive tax service market. Tax agents are now equipped with an environment where they can break free from repetitive file checking and simple guidance tasks to focus on more valuable advisory work based on the accuracy and speed provided by automation.

### ---

**Supplementary Analysis: Detailed Data Mapping and Specifications for System Integration**

To enhance the execution capability of this research, the technical relationship between API parameters used in each step and n8n expressions is summarized as follows.

#### **1. Canopy Client Data Lookup (n8n Expression Example)**

JSONPath to extract the value of a specific custom field (e.g., field ID is 12345) after fetching client info in the HTTP Request node:

* `{{ $json.custom_fields.find(f => f.field_id === "12345")?.value }}`
* This expression finds the object with the matching ID in the array and returns its value (Pending/Uploaded, etc.).

#### **2. Email Deduplication Management**

In an email-triggered model, prevent duplicate runs and missed events by controlling mailbox processing.

* Filter by sender/subject in Gmail search query
* Process only unread messages
* Optionally store processed message IDs to avoid re-runs

#### **3. Solapi AlimTalk Sending Conditions & Specifications**

Essential data structure when sending using Solapi API v4:

* `to`: Recipient number (exclude hyphens, include country code 82 recommended)
* `pfId`: Kakao Business Channel Unique ID
* `templateId`: Approved Alimtalk Template Code
* `variables`: Key-value pairs mapping to `#{variable}` within the template (JSON format)

Consistent application of these technical specifications prevents data loss between systems and enables rapid debugging in case of errors. Specifically, defining data parsing via explicit schemas is recommended over n8n's 'Autodetect' feature to prepare for potential changes in Canopy API response data formats.

### **Final Implementation Guide Summary**

| Process Step | Tools & Technologies | Key Configuration Items |
| :--- | :--- | :--- |
| **Email Trigger** | Gmail Trigger | sender/subject filters |
| **Identifier Parsing** | Email Parse | client\_id/email/name extraction |
| **Detail Lookup** | Canopy Public API v3 | Fetch client by ID for contact details |
| **Final Notification** | Solapi / Kakao AlimTalk | Template matching, SMS fail-over logic on failure |

The integrated automation model proposed in this report presents a practical solution that can perfectly implement complex business processes required in the field while strategically bypassing the closed nature of the Canopy API. Through this, tax firms will be able to realize sophisticated data-driven customer management and promote qualitative growth of services through efficient allocation of human resources. Automation of tax work is no longer a choice but an essential strategy for survival, and this architecture combining n8n and Solapi will be a powerful tool in that journey.
