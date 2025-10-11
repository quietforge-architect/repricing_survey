---
version: 1.0.0
author: Quiet Forge Development Studio
last_updated: 2025-10-11
---

# System Architecture

```mermaid
flowchart TD
    A[survey.html] -->|POST| B[Apps Script Web App]
    B -->|Append| C[Google Sheet]
    C --> D[Drive Sync/Backup]
    C --> E[Analytics Dashboard]
```

- survey.html: Mobile-friendly, multi-page form
- Apps Script: Receives POST, logs to Sheet
- Google Sheet: Stores responses, triggers sync/analytics
