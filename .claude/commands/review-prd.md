---
name: review-prd
description: Review current feature against PRD requirements
allowed-tools: Read, Grep
---

# Review Against PRD

Compare current implementation against PRD requirements.

## Steps

1. **Read the PRD**
   - Review @PRD.md for the feature in question

2. **Check implementation status**
   - Find relevant code files
   - Compare against requirements

3. **Report findings**
   - ✅ Implemented correctly
   - ⚠️ Partially implemented
   - ❌ Not implemented
   - 🔄 Differs from spec (explain)

## Report Format

```markdown
## Feature Review: [Feature Name]

### Requirements from PRD
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### Implementation Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| Req 1 | ✅ | Fully implemented |
| Req 2 | ⚠️ | Missing edge case |
| Req 3 | ❌ | Not started |

### Gaps Identified
1. Gap description
2. Gap description

### Recommended Actions
1. Action item
2. Action item
```

## Common Review Areas

- **Keyboard Component**: Check latency, multi-touch, velocity
- **Scoring System**: Check weights, thresholds, XP calculation
- **Exercise Format**: Check schema compliance
- **AI Coach**: Check prompt structure, rate limiting
- **Gamification**: Check XP curve, streak logic
