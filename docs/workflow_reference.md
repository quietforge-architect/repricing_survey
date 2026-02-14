---
version: 1.0.0
author: Quiet Forge Development Studio
last_updated: 2025-10-11
---

# Workflow Reference

1. User opens survey.html (local or hosted)
2. Fills out multi-page form (autosave enabled)
3. Submits form → POST to Apps Script endpoint
4. Apps Script logs response to Google Sheet
5. Sheet triggers backup, analytics, and agent tasks
