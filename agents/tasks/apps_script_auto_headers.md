Task: Auto-Create Missing Headers in Apps Script

Context: Add logic so the collector automatically inserts or extends headers as fields evolve.

10-point prompt:
1) If `getLastRow() === 0`, write a header row from request keys.
2) Determine any new keys not present in headers and append new columns.
3) Preserve `Timestamp` as column A; never duplicate it.
4) Build a deterministic column order from the updated headers each request.
5) For missing values in new columns, store empty strings for older rows.
6) Add an inline comment block documenting header evolution behavior.
7) Log header changes to a `Logs` sheet for auditability.
8) Unit test header updates using mock payloads with extra fields.
9) Provide a sample before/after header list in the code comments.
10) Verify large forms still append within Apps Script execution time limits.

