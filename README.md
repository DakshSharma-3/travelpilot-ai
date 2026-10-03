#  TravelPilot Agent

> **Intelligent Trip Planning & Disruption Management Agent**

TravelPilot is an AI-powered travel planning agent that doesn't just **create an itinerary — it manages it.**

Plan a trip around your destination, dates, budget, interests, schedule, and transportation preferences. Then, when something goes wrong, TravelPilot detects the disruption, evaluates alternatives, checks downstream conflicts, recalculates the budget and travel time, and intelligently replans the affected portion of the journey.

**Built as a functional hackathon MVP focused on agentic itinerary management and real-time disruption handling.**

---

##  The Problem

Most travel planners stop once an itinerary has been generated.

But real trips rarely go exactly as planned.

An attraction can become unavailable.
A reservation can get cancelled.
Weather can disrupt an activity.
A schedule can suddenly become impossible.

When that happens, travelers are usually forced to manually:

* Find a replacement activity
* Check whether it fits the schedule
* Recalculate travel time
* Recheck their budget
* Rearrange later activities
* Figure out what changed

**TravelPilot treats itinerary management as a continuous planning problem rather than a one-time generation task.**

---

##  What TravelPilot Does

TravelPilot follows a complete planning → monitoring → replanning loop:

```text
USER CONSTRAINTS
       ↓
ITINERARY GENERATION
       ↓
TRIP DASHBOARD
       ↓
DISRUPTION DETECTED
       ↓
CONFLICT ANALYSIS
       ↓
ALTERNATIVE EVALUATION
       ↓
CONSTRAINT CHECKING
       ↓
REPLANNING
       ↓
BUDGET + TRAVEL RECALCULATION
       ↓
UPDATED ITINERARY
```

The goal is simple:

> **When the trip changes, the itinerary changes with it.**

---

##  Core Agentic Workflow

The disruption engine is the heart of TravelPilot.

When an activity becomes unavailable, the agent doesn't simply substitute a predefined activity.

It:

### 1. Analyze Disruption

Identifies the affected activity, date, time slot and current itinerary state.

### 2. Check Conflicts

Examines downstream activities and determines whether the disruption creates scheduling or travel-time conflicts.

### 3. Find Alternatives

Searches structured destination/activity data for potential replacements.

Alternatives are evaluated against:

* User interests
* Available time
* Location
* Transport preference
* Estimated travel time
* Remaining budget
* Existing itinerary constraints

### 4. Recalculate

Updates:

* Activity timing
* Travel time
* Activity cost
* Daily spending
* Total trip spending
* Remaining budget

### 5. Apply Revised Itinerary

Only the affected portion of the itinerary is modified wherever possible.

Unaffected activities remain intact.

### 6. Explain the Change

TravelPilot presents a concise **“What Changed”** summary so the user can understand exactly how the plan was modified.

---

##  MVP Features

###  Intelligent Trip Planning

Users can provide:

* Destination
* Start & end dates
* Daily available hours
* Total budget
* Interests & preferences
* Preferred transport mode
* Hotel/accommodation location
* Preferred travel pace

TravelPilot then generates a structured day-by-day itinerary.

---

### Day-by-Day Trip Dashboard

The dashboard provides a centralized travel command center containing:

* Trip overview
* Daily schedules
* Activity timings
* Activity locations
* Estimated travel time
* Activity costs
* Transport costs
* Daily spending
* Total estimated spending
* Budget comparison
* Weather estimates
* Important timings
* Backup options

---

###  Weather-Aware Planning

Each day includes weather information through a dedicated weather service abstraction.

The MVP supports demo forecast data when an external weather API is unavailable.

> Demo weather is explicitly labeled rather than being presented as live data.

This architecture allows a real weather provider to be connected later without restructuring the itinerary engine.

---

###  Travel & Location Intelligence

TravelPilot estimates:

* Distance
* Travel duration
* Activity-to-activity movement
* Location compatibility

A routing service abstraction allows live map/routing APIs to be integrated later.

When external APIs aren't configured, the application uses structured demo estimates.

---

###  Dynamic Budget Tracking

Budget calculations are derived directly from itinerary data.

The system tracks:

```text
Activity Costs
      +
Transport Costs
      ↓
Daily Spend
      ↓
Total Trip Spend
      ↓
Remaining Budget
```

When an itinerary is replanned, the budget is automatically recalculated rather than relying on hardcoded summary values.

---

###  Disruption Management

The user can trigger an activity disruption directly from the itinerary.

For example:

```text
 Activity Unavailable

        ↓

Analyze disruption
        ↓
Check conflicts
        ↓
Evaluate alternatives
        ↓
Recalculate itinerary
        ↓
Apply changes
        ↓

 Revised itinerary
```

The interface makes the agent's reasoning workflow visible instead of hiding the entire process behind a chatbot response.

---

###  Natural-Language Trip Assistant

TravelPilot also provides an itinerary-aware assistant capable of answering questions such as:

> “What should I do tomorrow morning?”

> “Can I fit this activity into today's schedule?”

> “Which activities are close to my hotel?”

> “What happens if this activity is cancelled?”

The assistant works against the **current structured itinerary state**, rather than inventing an independent itinerary.

---

##  Structured Itinerary Engine

Every itinerary item is represented as structured state.

```ts

  
  Total Budget
  Start Time
  End Time
  Hotel/Accommodation Area
  Interests & Preferences
  Destination
  Estimated Cost
  Estimated Travel Minutes
  Preferred Transport
  Pace
  Notes

```

Trip constraints are also maintained as structured state.

This allows TravelPilot to perform deterministic operations such as:

* Time-overlap detection
* Travel-time validation
* Budget calculation
* Availability checking
* Alternative filtering
* Itinerary modification

LLM-based intelligence can then be used where it adds value, while deterministic checks maintain predictable behavior.

---


---

##  Demo Destination

The MVP is seeded with **Jaipur, India** as the primary demonstration destination.

The demo dataset includes activities spanning:

* History
* Architecture
* Food
* Culture
* Sightseeing

Activities are distributed across different locations with estimated costs and travel times so the complete planning and disruption workflow can be demonstrated without requiring external API configuration.

### Suggested Demo Flow

1. Open TravelPilot
2. Enter Jaipur as the destination
3. Select dates and trip constraints
4. Generate the itinerary
5. Review the dashboard
6. Inspect weather, travel and budget information
7. Trigger **“Activity Unavailable”**
8. Watch the agent analyze the disruption
9. Review the proposed alternative
10. Inspect the updated schedule and budget
11. Read the **“What Changed”** explanation

The entire workflow is designed to be testable immediately.

---

##  Design Philosophy

TravelPilot is designed as a **travel command center**, rather than a generic AI chatbot.

The interface uses:

* Premium travel-tech aesthetics
* Editorial typography
* Generous spacing
* Subtle gradients
* Structured cards
* Timeline-based schedules
* Clear status indicators
* Strong visual hierarchy
* Responsive layouts
* Accessible contrast

The disruption workflow receives strong visual emphasis so the core product differentiator is immediately understandable.

---

##  Tech Stack

| Layer       | Technology                       |
| ----------- | -------------------------------- |
| Frontend    | React + TypeScript               |
| Build Tool  | Vite                             |
| Styling     | Tailwind CSS                     |
| UI          | shadcn/ui                        |
| Backend     | Lovable full-stack architecture  |
| AI          | LLM-powered itinerary assistance |
| State       | Structured itinerary/trip state  |
| Maps        | Routing service abstraction      |
| Weather     | Weather service abstraction      |
| Development | Lovable + GitHub                 |

The architecture is intentionally lightweight so the prototype can remain functional and reliable within a hackathon environment.

---

##  External API Strategy

TravelPilot is designed to work **without requiring external API keys for the core demo.**

Service abstractions are used for:

* Weather
* Maps/routing
* Future travel APIs

If an external integration isn't configured, the system falls back to structured demo data.

This ensures that:

> **The product remains fully demonstrable even without live API credentials.**

No demo data is presented as live real-time information.

---

##  Hackathon MVP Priorities

TravelPilot intentionally focuses on the core experience rather than unnecessary platform complexity.

### Included

* Trip planning
* Structured itinerary generation
* Weather estimates
* Travel estimates
* Budget calculation
* Conflict detection
* Alternative selection
* Automated replanning
* Disruption workflow
* Natural-language itinerary assistant
* Demo data layer
* Responsive interface

### Intentionally Out of Scope

* Authentication
* Payments
* Social features
* Admin dashboards
* Complex booking infrastructure
* Full-scale travel marketplace
* Unnecessary platform features

The objective is a **complete working end-to-end prototype**, not a collection of disconnected features.

---

##  Getting Started

### Prerequisites

* Node.js
* npm

### Installation

```bash
git clone https://github.com/aksharajain-lab/travelpilot-agent.git

cd travelpilot-agent

npm install
```

### Run Locally

```bash
npm run dev
```

The development server will provide the local URL in your terminal.

---

##  Development with Lovable

This project was initially developed using [Lovable](https://lovable.dev/).

The repository remains fully accessible through GitHub for local development and continued engineering.

[Open the project in Lovable](https://lovable.dev/projects/c0774b92-0335-4a8a-923a-3f15b1510a10)

---

##  Success Criteria

TravelPilot succeeds when a judge can:

**1.** Open the application

**2.** Enter trip constraints

**3.** Generate a complete itinerary

**4.** View weather, travel and budget information

**5.** Trigger an activity disruption

**6.** Watch the agent analyze the disruption

**7.** See alternatives being evaluated

**8.** Receive a revised itinerary

**9.** See updated costs and timings

**10.** Understand exactly what changed

No static mockup.

No hardcoded single-response demo.

**A functional itinerary management loop.**

---

##  Vision

Travel planning shouldn't end when the itinerary is generated.

The next generation of travel assistants should continuously understand the state of a trip, detect when reality diverges from the plan, and help travelers adapt without rebuilding everything from scratch.

**TravelPilot is a step toward that idea.**

> **Plan the trip. Monitor the trip. Adapt the trip.**

---

##  Built For

**Hackathon Prototype — TravelTech / Agentic AI**

Built with a focus on:

* Agentic workflows
* Constraint-based planning
* AI-assisted decision making
* Dynamic itinerary management
* Human-readable replanning
* Practical AI product design

---

##  License

This project was created as a hackathon prototype.
