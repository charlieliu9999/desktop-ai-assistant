## ADDED Requirements

### Requirement: Web Search
`GET /v2/tools/search` SHALL support provider selection, max_results, and unified results.

#### Scenario: DuckDuckGo
- WHEN provider=duckduckgo
- THEN return `data.results[] = {title,url,snippet}` with totalResults.

### Requirement: Errors & Limits
Missing API key or HTTP errors SHALL map to standard error codes.

#### Scenario: Missing API key
- GIVEN provider=serpapi without API key configured
- WHEN calling `GET /v2/tools/search?q=test&provider=serpapi`
- THEN return `success=false` with `error.code="missing_api_key"` and no `data.results`.
