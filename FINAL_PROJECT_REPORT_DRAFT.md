# PulseOps Final Project Report Draft

## Project Information

- Project name: `PulseOps`
- Student: `Ayush Prabhakar`
- Jira: [SCRUM Project Board](https://prabhakarayush21.atlassian.net/jira/software/projects/SCRUM/boards/1)
- GitHub repository: [PulseOps Repository](https://github.com/Ayushprabhakar31/-Spring-2026-Graduate-Capstone-Project-CMSI-694-01-)
- Sprint 6 PR: [Sprint 6 Pull Request](https://github.com/Ayushprabhakar31/-Spring-2026-Graduate-Capstone-Project-CMSI-694-01-/pull/9)

## Executive Summary

The most accurate way to describe this project is as a capstone that changed meaningfully over the semester. It did not begin as a broad AI-native operations platform. It began as a more focused technical effort around API protection, suspicious traffic handling, and rate limiting. Over time, that narrower security feature set expanded into a larger system because I found that simply limiting requests was not enough to communicate value. I needed visibility, context, explanation, response workflows, and a better user experience around those security signals.

The final result is PulseOps: a full-stack security and observability product with live telemetry, suspicious traffic detection, AI-assisted analysis, reporting, automation, and presentation-ready operator workflows. The important story of the project is not only where it ended, but why it evolved from rate-limiting mechanics into a broader platform.

## 1. Original Plan

### Overview of the original project and objectives

At the beginning of the semester, the project was centered on rate limiting and abusive traffic control. The core idea was to build a system that could monitor API traffic, detect high-risk or repeated abusive request patterns, and apply or visualize rate-limiting behavior in a meaningful way. The initial technical emphasis was much more on backend behavior and security response than on building a multi-workspace product experience.

In other words, the original project was closer to an API protection and monitoring tool than to the final PulseOps platform.

### Motivation for undertaking the project

I chose this problem because rate limiting sits at the intersection of backend engineering, security, reliability, and product design. It is a practical problem with real operational value: services need to protect themselves from bot pressure, brute-force login attempts, suspicious traffic spikes, and noisy request patterns that can degrade performance.

I also wanted a capstone that would let me demonstrate more than CRUD application development. Starting from rate limiting gave me a technically grounded problem that could grow into broader observability and incident-response concerns.

### Intended value and goals

The intended value at the start of the project was:

- detect abusive or suspicious request behavior
- make rate-limiting behavior visible and understandable
- improve API reliability and safety
- give operators better information about threat or misuse patterns
- build a realistic security-focused full-stack system

### Key objectives

The key objectives in the early plan were:

- build backend logic around suspicious request detection and rate-limiting signals
- surface those signals through a dashboard or monitoring interface
- track request behavior and blocked events over time
- provide enough context to explain why traffic was limited or flagged
- create a project that could demonstrate both technical depth and product thinking

## 2. Results

### Overview of what was delivered

The final delivered project includes:

- a React-based multi-workspace frontend
- a Node.js/Express backend with SQLite persistence
- telemetry collection through API ingestion and browser snippet tracking
- real-time streaming for dashboards and operational views
- authentication and account workflows
- website registration and monitoring
- suspicious traffic classification, threat scoring, and rate-limit event visibility
- AI-assisted diagnosis and natural-language incident workflows
- export and reporting views for technical and non-technical audiences
- Cloudflare-style edge policy controls
- an automation engine for rule-based actions such as alerts, playbooks, edge lockdown, and shared reports

### Changes to scope and why they occurred

The project changed significantly from its initial rate-limiting focus. That change happened in several stages:

1. Rate limiting by itself felt too narrow for a semester-long capstone.  
   I could demonstrate blocked requests and suspicious traffic, but the project needed more surrounding context to feel complete.

2. The rate-limiting problem naturally expanded into observability.  
   Once I started tracking abusive traffic, I also needed visibility into latency, error rates, service health, threat posture, and traffic sources.

3. Observability expanded into response workflows.  
   It was not enough to show a blocked request count. I needed to answer: What happened? Why did it matter? What should the operator do next?

4. Response workflows expanded into presentation and reporting.  
   Because this was a capstone, I needed a system that could be explained to technical and non-technical stakeholders, so I added executive summaries, exports, and cleaner product surfaces.

5. Final polish emphasized product coherence.  
   Later sprints focused on cleaning the UI, removing weaker features, improving real-time behavior, and making the final system feel intentional rather than just feature-heavy.

The scope changed not because the original idea was abandoned, but because the original rate-limiting objective turned out to be the foundation for a larger and more valuable platform.

### How the delivered value measured up to the original goals

The delivered project still satisfies the spirit of the original goals, but at a larger scale. The final system still includes rate-limiting concepts, suspicious traffic handling, and abuse visibility. However, instead of stopping there, it places those ideas inside a broader operator platform that supports explanation, decision-making, reporting, and automation.

Compared with the original goals, the final value is stronger in three ways:

- it provides more operational context than a rate-limiting-only tool
- it is easier to demonstrate and explain to stakeholders
- it feels more like a real product than a single security feature

The tradeoff is that some parts of the project remain presentation-oriented rather than fully production-hardened, especially around enterprise infrastructure and long-term deployment architecture.

## 3. Project Lifecycle

### Discussion on how the project evolved

The clearest description of the lifecycle is:

1. `Initial concept: rate limiting and API protection`  
   The project started from a focused security problem: identify abusive traffic and represent rate-limiting behavior clearly.

2. `Early monitoring phase`  
   To support rate limiting, I needed visibility into request history, suspicious endpoints, blocked events, and threat patterns.

3. `Observability expansion`  
   The project grew into a dashboard that connected rate-limit events to broader signals like latency, errors, traffic sources, and service posture.

4. `Incident and AI workflow phase`  
   I added Security Analyst, War Room, Chat Workspace, and prompt-driven flows so the system could interpret signals rather than only display them.

5. `Productization and presentation phase`  
   The project was redesigned several times to improve readability, navigation, and demo quality. This changed it from a technical dashboard into a clearer product experience.

6. `Final integration and automation phase`  
   The final stage focused on real-time integration, deployment, automation rules, and cleaning up the experience for final presentation and submission.

### What challenges were encountered

The main challenges were:

- deciding how far to expand beyond the original rate-limiting scope
- keeping the project coherent as it moved from one focused feature into a larger system
- balancing backend functionality with frontend clarity
- preventing the UI from becoming cluttered as more modules were added
- making live/demo data feel credible enough for presentation
- maintaining time discipline while also improving polish late in the semester

### What feedback and learnings occurred, and how did that impact progress?

One of the biggest lessons was that a technically correct system can still feel incomplete if it does not explain itself well. That insight pushed the project away from a narrow backend/security tool and toward a more interpretive product with reporting, AI assistance, and user-guided workflows.

Another learning was that rate limiting becomes much more meaningful when it is treated as part of an operational narrative. For example, a blocked request matters more when it is tied to bot behavior, incident posture, affected endpoints, recommended next steps, and business-facing summaries.

Feedback throughout the semester reinforced that project evolution was expected, but that the report needed to reflect those changes honestly. That is why this revised draft explicitly presents the project as a journey from rate limiting to a broader observability and operations platform.

### How did your project objectives change, and why?

The original objective was to build a rate-limiting and suspicious-traffic monitoring system. The final objective became: build a platform that not only detects abuse, but also helps users understand, respond to, and communicate system posture.

The objective changed because:

- the original problem area naturally led to related observability needs
- the capstone benefited from a broader product story
- a larger platform made it easier to demonstrate engineering, UX, AI, and project management skills together

### What course of action did you consider at the beginning, and why did you choose this one?

At the beginning, I could have chosen:

- a very narrow backend-focused rate-limiting service
- a standard security dashboard with charts and alerts
- a general AI chatbot project

I chose the rate-limiting/security direction because it offered a concrete technical problem with room to grow. It gave me a way to start from a real engineering issue, then expand into observability, product design, and AI-assisted workflows without losing the original technical grounding.

### What did you include in scope, and what did you specifically exclude?

Included in scope:

- suspicious traffic visibility
- rate-limit event surfacing
- telemetry collection and live updates
- monitoring and threat posture
- AI-assisted interpretation and operator guidance
- reporting, exports, and presentation support
- automation and edge-style controls

Specifically excluded or de-emphasized:

- enterprise-grade identity/session infrastructure
- true multi-tenant architecture
- large-scale distributed storage
- production-grade cloud operations and infrastructure-as-code depth
- advanced ML training pipelines for anomaly detection

### Who were the stakeholders or customers?

The identified stakeholders/customers were:

- technical operators who need visibility into traffic abuse and system posture
- security-minded users who need context around blocked or suspicious traffic
- non-technical reviewers who need the system explained clearly through reports and demos
- the instructor, who evaluates both the process and the project evolution
- myself, using the project as a portfolio-quality demonstration of system design and product execution

## 4. Project Management

### Discussion about tools and processes applied

The project used:

- Jira for backlog, sprint planning, and issue tracking
- GitHub for source control and pull requests
- sprint-based planning to break the project into manageable phases
- incremental scope adjustments rather than pretending the original plan never changed

### How did this help or hinder the project?

Jira and sprint planning helped me because they created a visible record of the project’s evolution. That is especially important for this capstone, because the work did not stay fixed to the original rate-limiting scope. The sprint structure helped me move from:

- foundational backend/security work
- to dashboard and observability expansion
- to UI refinement and productization
- to real-time integration and final validation

The main difficulty was that creative redesign, integration cleanup, and presentation preparation are harder to estimate than feature tickets. As a result, some final work was less about adding new capabilities and more about making the system understandable and polished.

### What was difficult or easy, and why?

More difficult:

- knowing when to expand scope and when to cut it back
- managing UI complexity as more features were added
- integrating real-time flows across multiple pages
- making the product tell a clear story instead of just showing many features

Easier:

- iterating on backend endpoints once the architecture was established
- turning threat/rate-limit signals into additional product surfaces
- using sprints to identify what had to be finished versus what could be excluded

### How did working in sprints impact the project?

Working in sprints was useful because it made the changing project manageable. Instead of treating scope change as failure, I could treat each sprint as an opportunity to refine the direction. The later sprints especially helped move the project from “working feature set” to “coherent final product.”

### Summary or recap of sprints

At a high level, the sprint progression looked like this:

- early sprint work: focused more directly on backend security, reliability, and rate-limiting-related behavior
- middle sprint work: expanded into observability, threat visibility, and monitoring workflows
- later sprint work: added AI interpretation, reporting, cleaner navigation, and product polish
- Sprint 6: focused on backend stability, frontend improvements, observability enhancements, real-time integration, and final validation

Sprint 6 Jira scope:

- `SCRUM-31` Backend Stability Fixes
- `SCRUM-32` Frontend Dashboard Improvements
- `SCRUM-33` Advanced Observability Dashboard Enhancements
- `SCRUM-35` Enable real-time data integration
- `SCRUM-36` Final integration validation

## 5. Reflection

### What are the most valuable lessons you are taking away?

The most valuable lessons are:

- good projects often evolve beyond their initial plan, but that evolution needs to be documented honestly
- starting from a narrow technical feature can be a strength if it leads to a stronger final product
- product quality depends heavily on clarity, communication, and usability
- scope reduction can be just as important as feature addition
- technical depth and presentation quality both matter in a capstone

### What would you have done differently?

If I were doing the project again, I would:

- document scope changes more explicitly as they happened
- preserve the “rate limiting to platform” story earlier so the final report would be easier to write
- define the final product narrative sooner
- deploy the public backend earlier in the semester
- lock the design system earlier to reduce late rework

### How would you approach this type of project differently in the future?

In a future project of this type, I would still allow the scope to evolve, but I would track the evolution more deliberately across sprints. I would create clearer milestones around:

- core technical feature
- supporting observability
- user workflow design
- deployment
- final reporting and validation

That would make it easier to preserve the connection between the original idea and the final result.

### What follow-on work would you want to do?

Potential follow-on work includes:

- stronger production authentication and session management
- moving persistence from local SQLite to a more production-friendly database setup
- richer webhook and external service integrations
- more advanced analytics and anomaly detection logic
- more robust multi-tenant support
- stronger hosted infrastructure and monitoring around the public deployment

### What knowledge, skills, and processes did you learn that were useful?

This project strengthened my skills in:

- full-stack application development
- backend API design
- threat/rate-limit signal interpretation
- real-time data integration
- UI/UX cleanup and product framing
- sprint-based planning and backlog evolution
- deployment preparation and hosted backend configuration

## 6. Administrative

### Required links

- Jira: [SCRUM Project Board](https://prabhakarayush21.atlassian.net/jira/software/projects/SCRUM/boards/1)
- GitHub: [PulseOps Repository](https://github.com/Ayushprabhakar31/-Spring-2026-Graduate-Capstone-Project-CMSI-694-01-)

### Required screenshots to add before final submission

Add the following to the final report:

- Jira burndown report screenshots
- Sprint velocity screenshot
- final backlog remainder screenshot
- representative screenshots of:
  - Command Center
  - Website Guard
  - Security Analyst or War Room
  - Automation Center
  - Executive Suite or Export Center

## Conclusion

The strongest summary of this project is that it began as a rate-limiting and API-protection idea, then evolved into a larger AI-native operations platform because the surrounding context turned out to be just as important as the blocking logic itself. The final product is more ambitious than the original scope, but it is still rooted in that original security problem. That evolution is the real story of the project, and it reflects the way the capstone developed across the semester.
