---
name: Tickets.dev seller matching
description: Constraints for trustworthy cross-marketplace comparisons through Tickets.dev.
---

Tickets.dev comparisons must resolve the selected marketplace URL through the unified event catalog, capture each returned seller source explicitly, and require at least two successful seller captures before showing prices as a comparison.

**Why:** The sandbox can return a fixed fixture or no matching seller mapping for an arbitrary event URL. Falling back to the first discovery result can attach another event's prices to the user's event, while labeling every capture from the response snapshot can make multiple sellers appear to be Ticketmaster.

**How to apply:** Match by the selected event URL/path or verified event metadata, use the discovered marketplace as the authoritative seller label, and show a clear unavailable state when fewer than two sellers are available.