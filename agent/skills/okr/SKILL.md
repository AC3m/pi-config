---
name: okr
description: Draft, review, rewrite, and iterate OKRs using Google's OKR Playbook principles. Use when the user asks to create, write, review, improve, score, or cascade OKRs — including converting a delivery plan into real OKRs, refining KRs that are too task-oriented, creating a new OKR from a Jira epic or initiative, or cascading OKRs to direct reports. Also use when the user says "OKR", "objective and key results", "my goals", or shares an initiative and wants goals around it.
---

# OKR Skill

Help the user draft and sharpen OKRs that measure outcomes, not activity.

## Core model

- **Objective** = what to achieve. Ambitious, concrete, customer or business value visible.
- **Key Result** = proof you achieved it. Outcome metric, not a task list.
- **Committed** = promise. Score 1.0 expected.
- **Aspirational** = stretch. Average 0.7 expected.

---

## Workflow

### 1. Gather context

Collect before drafting:
- Owner, team, timeframe.
- Initiative, epic, or project scope.
- Committed vs aspirational.
- Whether OKR is prospective or retrospective (already in flight / mostly done).

If a Jira epic or project link is provided: read it thoroughly. Child tickets, PRD, SolDef, phase breakdowns. The richer the initiative context, the better the OKR.

### 2. Draft

**Objective:** One line. Expresses value to customer, user, or business. Avoids project names alone — name the impact, not just the initiative.

**KRs:** 3–4. Short, concrete, outcome-focused one-liners. Each KR independently scoreable — a rational observer can tell at end of period whether it was met.

### 3. Iterate

Expect iteration. The most common first-draft failure is a **delivery plan** — see Anti-patterns. Push back hard.

Test each KR: *"Is this measuring what happened, or what was done?"* If "what was done" — it's a task. Rewrite.

Keep refining until every KR is:
- Outcome-focused, not activity-based
- Short — one sentence, one idea
- Scoreable without ambiguity
- Free from fabricated metrics (especially for retrospective OKRs)

### 4. Propose cascade

After finalising, briefly map each KR to the next level down. One line per owner. It's a signal, not a full plan.

---

## Output format

```
**Objective: [One line describing the value delivered.]**

**KR1: [Short, concrete, outcome one-liner.]**

**KR2: [Short, concrete, outcome one-liner.]**

**KR3: [Short, concrete, outcome one-liner.]**

**Timeframe**
[Quarter or event window]
```

Rules:
- No bullet sub-points inside KRs
- No dates embedded in KR text — dates belong in Timeframe
- No multi-sentence elaboration in KR text
- One idea per KR

---

## Anti-patterns

The most common failure: producing a **delivery plan**.

| Looks like OKR | Actually | Fix |
|---|---|---|
| "Launch [feature] by [date] with [long scope list]..." | Milestone + scope list | One outcome line: what the launch achieves |
| "Have [capability] ready before [date] including [items]..." | Sprint goal | What does ready actually prove? |
| "Meet agreed [SLA/metric]..." | Fabricated metric | Remove if SLA was never agreed |
| "Achieve zero [incidents]" | Passive, weak verb | "Cause zero [incidents]" — direct, owned |
| Long KR listing all the things that will be done | Task list | Strip to the outcome one-liner |

**Retrospective OKRs:** when most work is already done, don't fabricate SLAs, baselines, or agreements that don't exist. Keep only what can be scored honestly against real evidence.

**Weak verbs to reject:** achieve, ensure, support, help, analyse, participate, investigate. Replace with direct outcome verbs: cause, serve, reach, maintain, reduce, release.

---

## OKR quality bar

### Objective
- Expresses user, customer, or business value
- Aggressive yet realistic
- Fits one line
- A rational observer can tell whether it was achieved

### Key Results
- Outcome, not activity
- One sentence, one idea
- Scoreable at end of period without ambiguity
- Collectively sufficient: 1.0 on all KRs = Objective achieved

### Classic traps
1. Delivery plan masquerading as KRs — most common
2. Activity verbs: launch, deliver, ensure, support, analyse, participate
3. Fabricated metrics for retrospective OKRs
4. Timid aspirational OKRs starting from constraints not ambition
5. All KRs landing on the last day of the period

---

## Committed vs aspirational

Ask when stakes matter. Default to committed for initiative-based OKRs on known scope.

- **Committed:** score 1.0 expected. Miss → escalate, replan, postmortem.
- **Aspirational:** 0.7 average healthy. Start from desired future, not current constraints.

---

## Scoring

- 1.0 = fully achieved
- 0.7 = strong progress
- 0.3 = started but fell short
- 0.0 = not attempted or abandoned

Committed below 1.0 needs explanation. Aspirational at 0.7 can be healthy.
