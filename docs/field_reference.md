version: 1.0.0
author: Quiet Forge Development Studio
last_updated: 2025-10-12
---

# Field Reference

The canonical source for question copy and response metadata is `schema/survey_questions.yaml`. Edit that file when refining prompts or changing options, then refresh the generated JSON with:

```powershell
npm run schema:generate
```

| Key               | Response Type    | Data Type      | Category             | Prompt                                                                 |
|-------------------|------------------|----------------|----------------------|-------------------------------------------------------------------------|
| experience        | select           | ordinal        | SellerProfile        | How long have you been selling on Amazon?                              |
| sku_count         | number           | numeric        | SellerProfile        | Roughly how many SKUs do you manage?                                   |
| model             | checkbox_group   | multiselect    | SellerProfile        | What best describes your selling model? (Pick any that fit)            |
| model_other       | textarea         | text_long      | SellerProfile        | If 'Other', what is your setup?                                        |
| repricer          | text             | string         | SellerProfile        | Which repricer(s) do you currently use?                                |
| keepa             | select           | string         | SellerProfile        | Do you use Keepa?                                                      |
| satisfaction      | number           | ordinal        | RepricingExperience  | How happy are you with speed & accuracy (1-5)?                         |
| painpoint         | textarea         | text_long      | RepricingExperience  | Biggest pain point or frustration                                      |
| glitch            | select           | string         | RepricingExperience  | Ever had a glitch or pricing error that hurt profits?                  |
| glitch_details    | textarea         | text_long      | RepricingExperience  | If yes, what happened and what did you learn?                          |
| style             | select           | string         | RepricingExperience  | Preferred repricing logic                                              |
| features          | checkbox_group   | multiselect    | RepricingExperience  | Which features or habits help you most day-to-day?                     |
| valuable_features | textarea         | text_long      | RepricingExperience  | Anything that makes life easier or actually works as promised?         |
| ai_used           | select           | string         | AI_Trust             | Have you tried an AI-powered repricer?                                 |
| ai_improvement    | select           | string         | AI_Trust             | Did AI improve profit or speed?                                        |
| trust_ai          | select           | string         | AI_Trust             | Would you trust a local AI with transparent reasoning?                 |
| trust_ai_reason   | textarea         | text_long      | AI_Trust             | If yes, no, or maybe - why?                                            |
| missing_data      | textarea         | text_long      | AI_Trust             | What data would you want repricers to use more intelligently?          |
| trust_features    | textarea         | text_long      | Wishlist             | What would make a repricer feel trustworthy?                           |
| local_tool        | select           | string         | Wishlist             | Would you use a desktop repricer that uses your own Keepa API credits? |
| privacy           | number           | ordinal        | Privacy              | How important is privacy and local control (1-5)?                      |
| monitoring        | textarea         | text_long      | Participation        | How do you currently monitor repricer activity and outcomes?           |
| feature_request   | textarea         | text_long      | Wishlist             | If you could add one "magic wand" feature, what would it be?           |
| anon_data         | select           | string         | Privacy              | Would you be open to anonymously sharing performance data later to help improve future versions? |
| contact           | text             | string         | Participation        | Optional: Want updates or beta invites? (Email or Discord handle)      |
