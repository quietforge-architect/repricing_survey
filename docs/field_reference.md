version: 2.0.0
author: Quiet Forge Development Studio
last_updated: 2025-10-12
---

# Field Reference

The canonical source for prompts, copy, and metadata is `schema/survey_questions.yaml`.  
Whenever you adjust wording or options, update that YAML file, then regenerate the derived JSON with:

```powershell
npm run schema:generate
```

| Key                     | Response Type  | Data Type    | Category        | Prompt                                                                                 |
|-------------------------|----------------|--------------|-----------------|----------------------------------------------------------------------------------------|
| years_selling           | select         | ordinal      | SellerProfile   | How long have you been slinging stories on Amazon?                                     |
| selling_commitment      | select         | string       | SellerProfile   | Is bookselling a side quest or your main saga?                                         |
| weekly_hours            | number         | numeric      | SellerProfile   | How many hours a week do you wrestle listings, boxes, and repricing dashboards?        |
| sourcing_style          | checkbox_group | multiselect  | SellerProfile   | What sourcing moves fill your cart (pick all that feel true)?                          |
| sourcing_style_other    | textarea       | text_long    | SellerProfile   | Optional “other” detail when sourcing style includes the custom option.                |
| non_book_inventory      | text           | string       | SellerProfile   | Anything besides books sneaking onto your shelves?                                     |
| listing_rhythm          | select         | string       | Workflow        | How do you batch your listing and repricing sessions?                                  |
| repricing_stack         | textarea       | text_long    | Workflow        | Name the tools, scripts, or lucky charms in your repricing stack.                      |
| price_check_frequency   | select         | string       | Workflow        | How often do you personally peek at prices after automation does its thing?            |
| signal_menu             | checkbox_group | multiselect  | Workflow        | Which signals most influence your repricing calls?                                     |
| signal_menu_other       | textarea       | text_long    | Workflow        | Optional “other” detail when signal menu includes the custom option.                   |
| inventory_anxiety       | number         | ordinal      | Workflow        | On a 1-5 scale, how spicy is your inventory anxiety right now?                         |
| risk_posture            | select         | string       | RiskInsights    | What best sums up your pricing risk posture?                                           |
| memorable_glitch        | textarea       | text_long    | RiskInsights    | Tell us about a pricing glitch that lives rent-free in your head.                      |
| safety_nets             | checkbox_group | multiselect  | RiskInsights    | Which safety nets do you lean on when automation goes feral?                           |
| safety_nets_other       | textarea       | text_long    | RiskInsights    | Optional “other” detail when safety nets include the custom option.                    |
| experiment_cadence      | select         | string       | RiskInsights    | How often do you run pricing experiments just to see what happens?                     |
| learning_sources        | checkbox_group | multiselect  | RiskInsights    | Where do you learn new pricing tricks or get inspired?                                 |
| learning_sources_other  | textarea       | text_long    | RiskInsights    | Optional “other” detail when learning sources include the custom option.              |
| wishlist_feature        | textarea       | text_long    | Wishlist        | If a repricer genie granted one wish, what would appear first?                         |
| ai_trust_temperature    | select         | string       | Privacy         | How warm and fuzzy do you feel about AI-assisted repricing today?                      |
| community_interest      | select         | string       | Participation   | Would you join a bookseller lab for data swaps, experiments, or gentle chaos?          |
| privacy_rating          | number         | ordinal      | Privacy         | Rate how much privacy & local control matters (1-5).                                   |
| contact                 | text           | string       | Participation   | Optional: want updates or beta invites? Drop an email or handle.                       |

> The survey intentionally keeps personally identifiable information optional.  
> Any column that might contain addresses, e-mail, or phone content is sanitized downstream unless the value matches the configured company allow list.
