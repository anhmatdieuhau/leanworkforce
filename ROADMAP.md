# Lean Workforce - Product Roadmap

## Priority Classification

**P0 (Critical - Blockers)**: Must fix before production launch. These prevent core functionality or cause data corruption.

**P1 (High - Important)**: Should implement soon. These significantly impact user experience or business operations.

**P2 (Medium - Nice to Have)**: Can be implemented later. These improve the platform but aren't essential for launch.

---

## 🚨 P0 - Critical (Must Fix Before Production)

### 1. Jira Sync Error Handling
**Status**: Not implemented  
**Impact**: High - System crashes when Jira API fails  
**Risk**: Production outages, data loss

**Current Behavior**: Application crashes on Jira 500 errors or missing milestones  
**Required Implementation**:
- Add try-catch blocks around all Jira API calls
- Store sync status and error logs in database
- Graceful degradation when Jira unavailable
- Manual retry mechanism for failed syncs
- Alert business users when sync fails

**Acceptance Criteria**:
- ✅ Jira API errors don't crash the application
- ✅ Sync errors logged to database with timestamps
- ✅ Business users notified of sync failures
- ✅ Manual retry button in business dashboard

---

### 2. ENCRYPTION_KEY Production Requirement
**Status**: Partially implemented (warns but uses temporary key)  
**Impact**: Critical - Data corruption on restart  
**Risk**: Jira credentials lost, security breach

**Current Behavior**: Generates random key if ENCRYPTION_KEY not set  
**Required Implementation**:
- **HARD REQUIREMENT**: Fail fast on startup if ENCRYPTION_KEY missing in production
- Environment detection (development vs production)
- Clear documentation for key generation and storage
- Migration script to re-encrypt existing tokens when key changes

**Acceptance Criteria**:
- ✅ Production deployment fails without ENCRYPTION_KEY
- ✅ Development shows warning but continues
- ✅ Documentation includes key generation instructions
- ✅ Existing encrypted data can be migrated to new key

---

### 3. Candidate Double-Booking Prevention
**Status**: Not implemented  
**Impact**: High - Revenue loss, candidate burnout  
**Risk**: Legal issues, reputation damage

**Current Behavior**: No validation - candidates can be assigned to multiple projects simultaneously  
**Required Implementation**:
- Candidate availability calendar (simple boolean: available/busy)
- Assignment validation before confirming
- Check existing active assignments
- Prevent overlapping assignments
- Require candidate confirmation before assignment

**Acceptance Criteria**:
- ✅ System checks candidate availability before assignment
- ✅ Candidates can mark themselves as available/busy
- ✅ Business users see candidate availability status
- ✅ Assignment requires candidate acceptance

---

## 🔶 P1 - High Priority (Implement Soon)

### 4. Candidate Application Status Workflow
**Status**: Not implemented  
**Impact**: Medium-High - Unclear process for candidates and businesses  
**User Confusion**: Current "Apply" button has no follow-up

**Current Behavior**: Candidates can "Apply" but status remains "pending" forever  
**Recommended Implementation**:
```
State Machine:
viewed → saved → applied → interviewed → accepted/rejected → active → completed

Transitions:
- Candidate "Apply" → status: "applied" → notify business
- Business "Interview" → status: "interviewed" → notify candidate
- Business "Accept" → status: "accepted" → notify candidate
- Business "Reject" → status: "rejected" → notify candidate
- Assignment confirmed → status: "active"
- Project completed → status: "completed"
```

**Acceptance Criteria**:
- ✅ Add `applicationStatus` field to applications table
- ✅ Business dashboard shows pending applications
- ✅ Business can accept/reject applications
- ✅ Email notifications at each state change
- ✅ Candidate dashboard shows application status history

---

### 5. Multi-Business Candidate Competition Logic
**Status**: Not implemented  
**Impact**: Medium - Unfair allocation, candidate overwhelm  
**Business Impact**: Poor candidate experience

**Current Behavior**: Undefined - what happens when 3 businesses want same candidate?  
**Recommended Implementation**:
```
Priority Scoring Algorithm:
- Fit Score: 40% weight
- Project Budget/Value: 30% weight
- Candidate Preference: 30% weight

Process:
1. Multiple businesses mark candidate as "interested"
2. System calculates priority score for each
3. Top 3 opportunities shown to candidate
4. Candidate chooses (or rejects all)
5. Losing businesses notified, can adjust offer
```

**Acceptance Criteria**:
- ✅ Track multiple business interests per candidate
- ✅ Priority scoring algorithm implemented
- ✅ Candidate sees top 3 matches
- ✅ Businesses can adjust offers to compete

---

### 6. Risk Alert Escalation Levels
**Status**: Partially implemented (basic risk detection only)  
**Impact**: Medium - Over/under reaction to delays  
**Efficiency**: Current all-or-nothing approach is crude

**Current Behavior**: High risk → Auto-activate backup (too aggressive)  
**Recommended Implementation**:
```
Risk Levels:
- Low (10-20% delay): Monitor only + notify business
- Medium (20-30% delay): Notify business + prepare backup list (don't activate)
- High (30-40% delay): Notify business + backup ready + require decision within 24h
- Critical (>40% delay): Auto-activate backup + escalate to management
```

**Acceptance Criteria**:
- ✅ 4-tier risk classification
- ✅ Different actions per tier
- ✅ Business notification includes recommended action
- ✅ Management escalation for critical risks

---

### 7. Business Review & Confirmation Workflow
**Status**: Not implemented  
**Impact**: Medium - Prevents irrelevant notifications  
**Quality**: Adds human-in-the-loop validation

**Current Behavior**: Auto-generate skill maps → Auto-calculate fit scores → Auto-notify candidates  
**Recommended Implementation**:
```
Workflow:
1. Create project
2. AI suggests skill map
3. 📋 Business reviews/edits skill map
4. Business confirms skill map
5. Calculate fit scores
6. 📋 Business reviews top 10 candidates
7. Business selects candidates to notify
8. Send notifications
```

**Acceptance Criteria**:
- ✅ Skill map shown in editable form before confirmation
- ✅ Business can modify AI suggestions
- ✅ Top candidates shown in review screen
- ✅ Business selects which candidates to notify

---

## 📦 P2 - Medium Priority (Future Enhancements)

### 8. Payment & Pricing Model
**Status**: Not implemented  
**Impact**: Low (initially) - Can launch without payments  
**Business Requirement**: Eventually critical for monetization

**Options to Consider**:
```
Model 1: Subscription
- Business: $99/month for unlimited projects
- Candidate: Free
- Platform fee: Monthly recurring

Model 2: Per-Hire Commission
- Business: Free to post, 15% fee on hire
- Candidate: Free
- Platform fee: One-time per successful hire

Model 3: Hybrid
- Business: $49/month + 10% commission
- Candidate: Free
- Platform fee: Monthly + commission
```

**Recommended**: Start with Model 2 (per-hire) to reduce barrier to entry

**Future Implementation**:
- Payment gateway integration (Stripe)
- Invoice generation
- Escrow for milestone-based payments
- Refund workflows

---

### 9. Post-Project Candidate Evaluation
**Status**: Not implemented  
**Impact**: Low - Platform works without it  
**Long-term Value**: Improves fit score accuracy over time

**Recommended Implementation**:
```
After project completion:
1. Business rates candidate (1-5 stars)
2. Breakdown: Skills (1-5), Communication (1-5), Timeliness (1-5)
3. Optional written feedback
4. Rating affects candidate's reputation score
5. Future fit scores weighted by past performance

Reputation Score Formula:
fitScore_adjusted = base_fitScore * (1 + (avgRating - 3) * 0.1)

Example:
- Base fit: 85%
- Avg rating: 4.5/5
- Adjusted fit: 85% * (1 + 0.15) = 97.75%
```

**Acceptance Criteria**:
- ✅ Rating form in business dashboard after project completion
- ✅ Ratings stored in database
- ✅ Reputation score calculated and displayed
- ✅ Fit score algorithm includes reputation weight

---

### 10. Project Cancellation Policy
**Status**: Not implemented  
**Impact**: Low - Edge case, not common  
**Risk Management**: Protects candidates from unfair cancellations

**Recommended Policy**:
```
Cancellation Rules:
- Before assignment: Full refund, no penalty
- After assignment but <7 days: 
  → 50% compensation to candidate
  → 50% refund to business
- After 7 days: 
  → Full payment to candidate for work completed
  → Business charged full milestone amount
  → Platform fee retained
```

**Future Implementation**:
- Cancellation request form
- Automated refund/payment processing
- Dispute resolution workflow
- Cancellation analytics (track abuse)

---

### 11. Business Metrics Dashboard
**Status**: Not implemented  
**Impact**: Low - Analytics nice-to-have  
**Value**: Helps optimize platform over time

**Metrics to Track**:
```
1. Time-to-Fill
   - Avg: Project created → Candidate assigned
   - Target: <48 hours

2. Candidate Utilization Rate
   - % time assigned vs available
   - Target: 60-80% (avoid burnout)

3. Fit Score Accuracy
   - Correlation: Predicted fit vs actual rating
   - Target: >0.7 correlation

4. Backup Activation Success Rate
   - % backups that prevented delays
   - If <50%, reconsider threshold

5. Churn Metrics
   - Candidate drop-off after signup
   - Business retention after first project
```

**Future Implementation**:
- Analytics dashboard for platform admin
- Automated reports (weekly/monthly)
- Metric visualization with charts
- Anomaly detection and alerts

---

### 12. Backup Candidate Workflow Refinement
**Status**: Partially implemented  
**Impact**: Low - Current logic works but can be improved  
**Edge Case**: Candidate rejects after backup activated

**Current Behavior**: Undefined what happens if candidate rejects after backup already assigned  
**Recommended State Machine**:
```
Primary Assignment States:
pending → offered → accepted → active → completed → failed

Backup Assignment Flow:
1. Primary candidate = "active"
2. Risk detection triggers backup = "standby"
3. If primary fails → backup = "offered"
4. If backup accepts → backup = "active", primary = "failed"
5. If backup rejects → try next backup in queue

Rules:
- Can't have 2 active candidates on same milestone
- Primary candidate can be re-assigned if backup fails
- Track transition history for auditing
```

**Acceptance Criteria**:
- ✅ State machine enforces valid transitions
- ✅ Transition history logged to database
- ✅ Validation prevents double-active assignments
- ✅ UI shows current state clearly

---

## 📊 Implementation Timeline

### Phase 1: Production Readiness (Week 1-2)
**Goal**: Fix P0 blockers
- [ ] Jira sync error handling
- [ ] ENCRYPTION_KEY hard requirement
- [ ] Candidate double-booking prevention

**Success Criteria**: Platform can safely launch without data corruption or crashes

---

### Phase 2: Core Workflows (Week 3-4)
**Goal**: Complete P1 high-value features
- [ ] Application status workflow
- [ ] Multi-business competition logic
- [ ] Risk alert escalation levels
- [ ] Business review & confirmation workflow

**Success Criteria**: Professional workflow that handles real-world scenarios

---

### Phase 3: Optimization (Month 2-3)
**Goal**: Implement P2 enhancements
- [ ] Payment & pricing model
- [ ] Post-project evaluation
- [ ] Project cancellation policy
- [ ] Metrics dashboard
- [ ] Backup workflow refinement

**Success Criteria**: Platform ready for scale and monetization

---

## 🎯 Success Metrics

### After Phase 1 (Production Ready):
- ✅ Zero production crashes in 1 week
- ✅ 100% data persistence across restarts
- ✅ Zero double-booking incidents

### After Phase 2 (Core Workflows):
- ✅ <48 hour average time-to-fill
- ✅ >80% candidate satisfaction with assignment process
- ✅ <5% false-positive risk alerts

### After Phase 3 (Optimized):
- ✅ Payment success rate >95%
- ✅ Fit score accuracy correlation >0.7
- ✅ <10% monthly churn rate

---

## 📝 Notes

- **Prioritization Rationale**: P0 items prevent production use, P1 items are needed for professional operations, P2 items are optimizations
- **Timeline**: Aggressive but achievable with focused effort
- **Flexibility**: Can adjust priorities based on user feedback after soft launch
- **Technical Debt**: Some P2 items (like metrics) can use simple implementations first, then optimize later

---

**Last Updated**: October 29, 2025  
**Status**: Initial roadmap based on product feedback analysis
