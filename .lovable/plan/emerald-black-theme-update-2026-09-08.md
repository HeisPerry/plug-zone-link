# Emerald + Black Theme Update

## Goal
Apply the requested emerald, black, light background, white surface, muted text, and border palette across PlugZone without changing layout, navigation, behavior, or marketplace flows.

## Changes
- Replace the shared light-theme color tokens with the exact requested values: emerald `#16A34A`, dark/text `#111827`, background `#F8FAFC`, surface `#FFFFFF`, muted text `#64748B`, and border `#E2E8F0`.
- Derive hover, soft-accent, focus, disabled, shadow, and gradient states from that palette so emerald remains a strategic accent rather than dominating the interface.
- Align dark mode with emerald accents and neutral black/charcoal surfaces while preserving readable contrast.
- Replace legacy hardcoded colors in fallback/error and avatar styling with the new neutral/emerald system, retaining only necessary semantic danger/warning and telecom brand colors.
- Verify the homepage and authenticated shared navigation at mobile and desktop sizes, including buttons, cards, forms, links, active states, footer, and mobile navigation.

## Technical details
- Keep the existing semantic class names and update their values centrally in the global stylesheet, so all current pages inherit the new theme consistently.
- Do not modify component structure, routes, data, or interactions.
- Preserve accessibility-focused status colors where red/amber distinctions are necessary.
