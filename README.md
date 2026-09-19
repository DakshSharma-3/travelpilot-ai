# TravelPilot AI

Build a functional hackathon MVP called TravelPilot: Intelligent Trip Planning & Disruption Management Agent. This is NOT a static mockup. Prioritize a complete end-to-end working prototype with no authentication, payments, social, admin, or unnecessary complexity.

PRODUCT GOAL:
TravelPilot generates a day-by-day itinerary from constraints and then manages disruptions. The differentiator is disruption handling: when an activity is unavailable, detect conflicts, evaluate alternatives, replan only the affected portion where possible, preserve unaffected itinerary items, recalculate budget/travel timing, and explain what changed.

MVP FLOW:
1) Premium landing/home with clear CTA "Plan my trip".
2) Trip form fields: destination, start date, end date, daily available start/end times, total budget, interests/preferences, preferred transport mode, optional hotel/accommodation location, optional pace.
3) Generate itinerary.
4) Dashboard showing trip summary, clearly labeled demo weather forecast/estimate, day-by-day itinerary, activity times/locations, estimated travel minutes between activities, activity/transport estimated costs, daily spend and total vs budget, important timings, and backup alternatives where relevant.
5) Each itinerary activity has an interactive "Activity unavailable" disruption action.
6) Disruption agent visibly progresses through: Analyze disruption → Check conflicts → Find/evaluate alternatives → Recalculate → Apply revised itinerary. It must operate on structured current itinerary state, not a separate invented itinerary.
7) After disruption, show updated itinerary and concise "What changed" explanation.
8) Natural-language trip assistant on dashboard. It should answer current-state questions and simple modifications, examples: "What should I do tomorrow morning?", "Can I fit this activity into today's schedule?", "Which activities are close to my hotel?", "What happens if this activity is cancelled?" Keep assistant grounded in structured itinerary state. For simple commands, modify the itinerary state only when safe and show what changed.

AGENTIC/ENGINE REQUIREMENTS:
Use structured TypeScript itinerary/trip state. Each itinerary item must contain at minimum:
id, date, startTime, endTime, title, category, location, estimatedCost, estimatedTravelMinutes, status, notes.
Represent trip constraints in structured state.
Implement deterministic conflict detection based on overlapping time windows plus travel time.
Budget calculations MUST be derived from itinerary data, never hardcoded.
Disruption replanning must preserve unaffected items and modify only necessary items.
Do not hardcode one fixed "cancel museum = cafe" mapping. Seed a structured Jaipur activity catalog and dynamically filter/score alternatives by interest/category fit, available time, location/travel time, transport preference, pace, and remaining budget. Use a transparent scoring function and display the selected alternative/reasoning briefly.
Implement service abstractions:
- weatherService with demo forecast fallback and a clear "Demo forecast" label; easy future replacement with real API.
- routingService with demo distance/travel-time estimates based on structured locations and clear "Demo routing" label; no fake live API claims.
No external API keys required for demo.

JAIPUR DEMO DATA:
Seed realistic activities covering history/architecture/food, varied locations, costs, and times. Include Amber Fort, City Palace, Jantar Mantar, Hawa Mahal, Albert Hall Museum, Jal Mahal viewpoint, Nahargarh Fort, Patrika Gate, local food experiences such as Masala Chowk / Lassiwala-style food stop, and suitable alternatives. Use approximate demo costs in INR and realistic demo travel minutes. Use a small Jaipur location graph/coordinates or zone-based distances for deterministic routing. Make sure a generated demo trip can trigger a meaningful disruption with downstream conflict handling.
The default demo should be easy for judges: offer "Try Jaipur demo" / prefilled sample constraints and then generate.

UX/DESIGN:
Premium modern travel-tech interface, not generic chatbot. Editorial SaaS aesthetic, strong typography, generous spacing, subtle gradients, cards, timeline/schedule, clear status badges, responsive desktop/mobile, accessible contrast, restrained animations. Dashboard should feel like a travel command center. Make disruption flow visually obvious with a progress stepper and changed-item highlighting.
Use modular maintainable components.
Include loading, empty, error, and success states.
Avoid overengineering.

TECH:
Use default Lovable full-stack TypeScript stack with Tailwind + shadcn/ui. Keep the MVP self-contained and reliable without requiring auth/database/API keys. If persistence is useful, use local state/localStorage; do not introduce unnecessary backend dependencies.
Organize code into types/models, demo data/services, itinerary engine, disruption engine, assistant logic, and UI components.
Create a polished app that works immediately after opening.

IMPORTANT ACCEPTANCE TEST:
A judge can open app → click Try Jaipur demo → see trip form → generate itinerary → see budget/weather/travel information → click Activity unavailable on an activity → visibly watch agent stages → see alternative selected from structured catalog → see only affected/downstream items changed while unaffected items remain → see recalculated spend/travel time → see "What changed" explanation → ask assistant a current-itinerary question and get grounded answer.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a9ddfb6b-d30b-4732-b250-0eec80218393).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
