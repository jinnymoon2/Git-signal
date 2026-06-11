# GitSignal

GitSignal is a full-stack GitHub activity analysis dashboard. It connects to a user's GitHub account, imports repository metadata, analyzes commit activity, computes developer behavior scores, and generates a developer profile report.

The project is inspired by Git activity-based developer insight products. It is not a clone of any private system. The goal is to demonstrate the backend behavior behind a GitHub-connected analysis platform: OAuth authentication, repository synchronization, metadata ingestion, scoring logic, report generation, and dashboard visualization.

## Features

* GitHub OAuth login
* Secure session handling with encrypted GitHub token storage
* Repository metadata synchronization
* Commit metadata analysis
* Language distribution analysis
* Developer scoring system
* Developer type classification
* Dashboard with repository selection
* Generated strengths and recommendations
* Logout flow with session cleanup

## Tech Stack

### Frontend

* Next.js App Router
* TypeScript
* React
* CSS

### Backend

* Next.js Route Handlers
* GitHub REST API
* Supabase PostgreSQL
* Server-side session handling
* AES-256-GCM token encryption

### Database

* Supabase Postgres

### Deployment

* Vercel

## Project Flow

```text
User opens GitSignal
→ User clicks "Continue with GitHub"
→ GitHub OAuth authorization starts
→ GitHub redirects back with OAuth code
→ Backend exchanges code for access token
→ Backend fetches GitHub user profile
→ Backend creates or updates local user
→ Backend encrypts and stores GitHub token
→ User lands on dashboard
→ User syncs repositories
→ Backend fetches GitHub repository metadata
→ User selects repositories
→ Backend fetches commit and language metadata
→ Backend analyzes activity patterns
→ Backend computes developer scores
→ Backend generates developer type and report
→ Frontend displays the report
```

## What Data Is Analyzed

GitSignal analyzes GitHub activity metadata. It does not read or store source code.

The system uses:

* Repository name
* Repository full name
* Repository description
* Primary language
* Star count
* Fork count
* Public/private status
* Repository creation date
* Repository update date
* Commit messages
* Commit author dates
* Language distribution from GitHub
* Number of commits
* Active contribution days
* Active contribution weeks
* First commit date
* Last commit date

The system does not analyze source file contents.

## Backend Architecture

The backend is implemented using Next.js Route Handlers.

Important backend routes:

```text
GET  /api/auth/github/start
GET  /api/auth/github/callback
POST /api/auth/logout
GET  /api/me
GET  /api/github/repos
POST /api/github/repos
POST /api/analysis/start
GET  /api/reports/latest
```

### GitHub OAuth

The GitHub OAuth flow starts at:

```text
/api/auth/github/start
```

The backend redirects the user to GitHub with the required OAuth parameters.

After the user authorizes the app, GitHub redirects back to:

```text
/api/auth/github/callback
```

The callback route exchanges the temporary OAuth code for a GitHub access token, fetches the user profile, stores or updates the user in Supabase, creates a session, and redirects the user to the dashboard.

### Session Handling

The session system stores only a session ID in the browser cookie.

The GitHub access token is encrypted before being stored in the database.

```text
Browser cookie:
git_signal_session = session_id

Database:
encrypted_github_token = encrypted token value
```

This prevents exposing the GitHub token directly to the browser.

### Repository Sync

When the user clicks "Sync GitHub Repositories," the backend calls GitHub's repository API and saves repository metadata into Supabase.

The repository sync stores:

```text
github_repo_id
name
full_name
description
primary_language
stars
forks
is_private
github_created_at
github_updated_at
```

### Analysis Pipeline

When the user selects repositories and clicks "Analyze Selected," the backend runs the analysis pipeline.

```text
Selected repositories
→ Fetch commits
→ Fetch language distribution
→ Analyze repository-level activity
→ Save repository snapshots
→ Compute developer scores
→ Classify developer type
→ Save developer report
```

## Database Tables

### app_users

Stores GitHub-authenticated users.

```text
id
github_id
github_username
avatar_url
created_at
```

### user_sessions

Stores user sessions and encrypted GitHub tokens.

```text
id
user_id
encrypted_github_token
created_at
expires_at
```

### repositories

Stores synced GitHub repository metadata.

```text
id
user_id
github_repo_id
name
full_name
description
primary_language
stars
forks
is_private
github_created_at
github_updated_at
created_at
```

### analysis_jobs

Tracks analysis runs.

```text
id
user_id
status
error_message
created_at
completed_at
```

### repository_snapshots

Stores repository-level analysis output.

```text
id
job_id
repository_id
commit_count
active_days
active_weeks
first_commit_at
last_commit_at
languages
commit_type_counts
created_at
```

### developer_reports

Stores the final generated developer profile.

```text
id
job_id
user_id
developer_type
scores
summary
strengths
recommendations
created_at
```

## Analysis Algorithm

GitSignal uses a rule-based scoring algorithm. It is not a machine learning model.

The algorithm turns repository activity metadata into five developer behavior scores:

```text
Contribution
Consistency
Adaptability
Agility
Stability
```

Each score is normalized to a scale from 0 to 100.

## Repository-Level Computation

For each selected repository, GitSignal fetches commit metadata and language metadata.

### Commit Count

```text
commitCount = number of fetched commits
```

This represents visible implementation activity.

### Active Days

```text
activeDays = number of unique calendar days with commits
```

Example:

```text
Commit dates:
2026-06-01
2026-06-01
2026-06-03

activeDays = 2
```

### Active Weeks

```text
activeWeeks = number of unique year-week combinations with commits
```

Example:

```text
2026-W22
2026-W22
2026-W23

activeWeeks = 2
```

This is used to estimate contribution consistency over time.

### First Commit Date

```text
firstCommitAt = earliest commit author date
```

### Last Commit Date

```text
lastCommitAt = latest commit author date
```

The last commit date is used to estimate whether a repository is recently maintained.

### Language Diversity

The backend collects language names from GitHub's language API.

Example:

```json
{
  "TypeScript": 50231,
  "CSS": 8123,
  "JavaScript": 2100
}
```

For scoring, the algorithm mainly uses the number of unique languages across selected repositories.

```text
languageDiversity = count of unique languages across all selected repositories
```

### Commit Type Classification

Commit messages are grouped into basic categories.

The classifier uses simple keyword and prefix matching:

```text
feat or add       → feature
fix or bug        → fix
docs or readme    → docs
refactor          → refactor
test              → test
chore             → chore
style or css      → style
other             → other
```

Example:

```text
"feat: add GitHub login"      → feature
"fix: repair logout redirect" → fix
"docs: update README"         → docs
"refactor auth callback"      → refactor
```

The output is saved as:

```json
{
  "feature": 12,
  "fix": 5,
  "docs": 3,
  "refactor": 2,
  "other": 8
}
```

## Score Computation

After repository snapshots are created, the backend computes five scores.

### 1. Contribution Score

Contribution measures the overall amount of visible implementation activity.

Formula:

```text
contribution = clamp(round(log10(totalCommits + 1) * 35), 0, 100)
```

Where:

```text
totalCommits = sum of commit counts across selected repositories
```

Why logarithmic scaling is used:

A raw commit count can grow very quickly. A developer with 1,000 commits should not receive a score ten times higher than a developer with 100 commits. Logarithmic scaling rewards more activity while preventing large repositories from dominating the score too aggressively.

Example:

```text
totalCommits = 10
log10(11) * 35 ≈ 36

Contribution ≈ 36/100
```

```text
totalCommits = 100
log10(101) * 35 ≈ 70

Contribution ≈ 70/100
```

```text
totalCommits = 1000
log10(1001) * 35 ≈ 105

Contribution = 100/100 after clamping
```

### 2. Consistency Score

Consistency measures how regularly the developer contributes across time.

Formula:

```text
consistency = clamp(round(totalActiveWeeks * 6), 0, 100)
```

Where:

```text
totalActiveWeeks = sum of active weeks across selected repositories
```

Why active weeks are used:

A developer with commits spread across many weeks shows more sustained contribution behavior than a developer with all commits on a single day.

Example:

```text
totalActiveWeeks = 5
consistency = 5 * 6 = 30
```

```text
totalActiveWeeks = 12
consistency = 12 * 6 = 72
```

```text
totalActiveWeeks = 20
consistency = 120 → clamped to 100
```

### 3. Adaptability Score

Adaptability measures technical range across languages and repositories.

Formula:

```text
adaptability = clamp(round(languageDiversity * 18 + repoCount * 5), 0, 100)
```

Where:

```text
languageDiversity = number of unique languages across selected repositories
repoCount = number of selected repositories
```

Why this works:

A developer who has worked across multiple repositories and languages likely has broader technical exposure than someone with only one small repository in one language.

Example:

```text
languageDiversity = 2
repoCount = 3

adaptability = 2 * 18 + 3 * 5
adaptability = 36 + 15
adaptability = 51
```

### 4. Agility Score

Agility measures recent activity and short-term development movement.

Formula:

```text
agility = clamp(round(recentCommitRatio * 80 + totalCommits * 0.3), 0, 100)
```

Where:

```text
recentCommitRatio = recently active repositories / selected repositories
```

A repository is considered recently active if its latest commit happened within the last 90 days.

Why this works:

Recent activity is a strong signal that the developer is actively building or maintaining projects. The score also gives a small boost for total commit volume.

Example:

```text
selected repositories = 4
recently active repositories = 3

recentCommitRatio = 3 / 4 = 0.75

totalCommits = 50

agility = 0.75 * 80 + 50 * 0.3
agility = 60 + 15
agility = 75
```

### 5. Stability Score

Stability measures maintenance behavior and project continuity.

Formula:

```text
stability = clamp(round(maintainedRepoRatio * 70 + totalActiveWeeks * 2), 0, 100)
```

Where:

```text
maintainedRepoRatio = repositories maintained within the last 6 months / selected repositories
totalActiveWeeks = sum of active weeks across selected repositories
```

A repository is considered maintained if its latest commit happened within the last 6 months.

Why this works:

Stability is not just about activity volume. It reflects whether repositories continue to receive updates over time.

Example:

```text
selected repositories = 5
maintained repositories = 3

maintainedRepoRatio = 3 / 5 = 0.6

totalActiveWeeks = 12

stability = 0.6 * 70 + 12 * 2
stability = 42 + 24
stability = 66
```

## Score Normalization

All scores are passed through a clamp function:

```text
clamp(score) = max(0, min(100, round(score)))
```

This ensures every metric stays within:

```text
0 to 100
```

Example:

```text
raw score = 124
final score = 100
```

```text
raw score = -5
final score = 0
```

## Developer Type Classification

After computing the five scores, GitSignal assigns a developer type.

Current rule-based logic:

```text
if adaptability >= 75:
  Explorer

else if agility >= 75 and contribution >= 60:
  Sprinter

else if stability >= 75 and consistency >= 65:
  Keeper

else if contribution >= 70 and consistency >= 60:
  Builder

else if stability >= 60 and agility >= 50:
  Fixer

else:
  Builder
```

## Developer Types

### Explorer

A developer with high adaptability. This usually means they work across multiple languages, repositories, or technical contexts.

Primary signal:

```text
High adaptability
```

### Sprinter

A fast-moving developer with strong recent activity and meaningful contribution volume.

Primary signals:

```text
High agility
High contribution
```

### Keeper

A maintenance-oriented developer who shows stable and consistent activity over time.

Primary signals:

```text
High stability
High consistency
```

### Builder

A steady implementation-focused developer with meaningful contribution activity and consistency.

Primary signals:

```text
High contribution
High consistency
```

### Fixer

A practical developer who shows maintenance and recent activity patterns.

Primary signals:

```text
Moderate to high stability
Moderate to high agility
```

### Leader

Leader is included as a future type. The current MVP does not fully classify Leader because leadership signals require pull request review data, collaboration graphs, issue assignment behavior, and review participation.

Future Leader signals could include:

```text
Pull request reviews
Issue discussion activity
Repository ownership
Review frequency
Cross-repository collaboration
Merge activity
Team contribution patterns
```

## Example Report Output

```text
Developer Type: Builder

This developer profile is classified as Builder. The strongest signal is contribution, based on repository activity, commit metadata, language distribution, and recent maintenance patterns.

Scores:
Contribution: 72
Consistency: 66
Adaptability: 58
Agility: 70
Stability: 62

Strengths:
- Shows meaningful implementation activity across repositories.
- Maintains a steady contribution rhythm over time.
- Demonstrates maintenance behavior and project continuity.

Recommendations:
- Add project-level explanations to make Git activity easier for recruiters to understand.
```

## Privacy-Aware Design

GitSignal is designed around metadata-based analysis.

The app does not intentionally fetch or store source code contents. The goal is to analyze how a developer works from repository activity signals, not what private source code contains.

The app stores:

```text
GitHub user profile metadata
Repository metadata
Commit metadata
Language statistics
Computed report data
Encrypted GitHub access token
```

The app does not store:

```text
Source code files
Raw repository file contents
Private code snippets
```

## Environment Variables

Create a `.env.local` file for local development.

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

SESSION_COOKIE_NAME=git_signal_session

TOKEN_ENCRYPTION_KEY=your_32_character_key
```

For production on Vercel:

```env
NEXT_PUBLIC_APP_URL=https://your-stable-vercel-domain.vercel.app
```

Do not commit `.env.local`.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Deployment

The app can be deployed on Vercel.

Production setup requires:

1. Add all environment variables to Vercel.
2. Set `NEXT_PUBLIC_APP_URL` to the stable Vercel domain.
3. Set the GitHub OAuth app callback URL to:

```text
https://your-stable-vercel-domain.vercel.app/api/auth/github/callback
```

4. Redeploy the Vercel project after changing environment variables.

## Limitations

This is an MVP prototype.

Current limitations:

* Analyzes only the most recently fetched commits from GitHub API calls
* Uses rule-based scoring instead of machine learning
* Does not deeply analyze pull request review behavior
* Does not fully support Leader classification yet
* Does not generate PDF reports
* Does not include a public share page
* Does not include a background job queue
* Does not use GitHub App installation permissions
* Does not analyze private repositories unless OAuth scopes are changed

## Future Improvements

Potential improvements:

* Add radar chart visualization
* Add repository detail pages
* Add pull request and review analysis
* Add issue activity analysis
* Add Leader classification
* Add LinkedIn profile generator
* Add resume bullet generator
* Add public shareable report page
* Add README badge generator
* Add PDF export
* Add background job queue
* Add GitHub App support for more granular permissions
* Add better privacy settings and disconnect controls
* Add rate-limit handling and retry logic

## Resume Description

```text
Built GitSignal, a full-stack GitHub activity analysis dashboard using Next.js, TypeScript, Supabase Postgres, and GitHub OAuth. Implemented server-side OAuth token exchange, encrypted token storage, repository metadata ingestion, commit activity analysis, rule-based developer scoring, and a dashboard for developer type classification.
```

## Project Purpose

GitSignal demonstrates how a GitHub-connected developer analytics product can work behind the scenes. It shows the full backend flow from OAuth authentication to repository ingestion, metadata analysis, scoring, classification, and report generation.

The project is designed to be understandable, explainable, and privacy-aware.
