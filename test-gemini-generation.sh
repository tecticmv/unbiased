#!/bin/bash
# Test Gemini code generation locally

if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: GEMINI_API_KEY not set"
  echo "Set it with: export GEMINI_API_KEY=your-key"
  exit 1
fi

# Read sample files
COUNTRIES_TS=$(cat src/lib/countries.ts)
CONSTANTS_TS=$(cat functions/api/lib/constants.ts)

PROMPT="Add Japan to this project. Generate COMPLETE updated file contents.

VALIDATED COUNTRY DATA:
{
  \"countryName\": \"Japan\",
  \"slug\": \"japan\",
  \"currency\": \"JPY\",
  \"capital\": \"Tokyo\",
  \"translations\": {
    \"en\": \"Japan\",
    \"dv\": \"ޖަޕާން\",
    \"hi\": \"जापान\"
  }
}

FILES TO MODIFY:

=== src/lib/countries.ts ===
${COUNTRIES_TS:0:500}...
[truncated for test]

=== functions/api/lib/constants.ts ===
${CONSTANTS_TS:0:500}...
[truncated for test]

Return JSON with structure:
{
  \"countries_ts\": \"complete file\",
  \"constants_ts\": \"complete file\"
}

Return ONLY valid JSON."

echo "Testing Gemini code generation..."
echo "=================================="

RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp:generateContent?key=${GEMINI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"contents\": [{
      \"parts\": [{
        \"text\": $(echo "$PROMPT" | jq -Rs .)
      }]
    }],
    \"generationConfig\": {
      \"temperature\": 0.2,
      \"maxOutputTokens\": 8000,
      \"responseMimeType\": \"application/json\"
    }
  }")

echo "Raw Response:"
echo "$RESPONSE" | jq '.'

echo ""
echo "Extracted Generated Code:"
echo "$RESPONSE" | jq -r '.candidates[0].content.parts[0].text' | jq '.'

# Validate JSON
if echo "$RESPONSE" | jq -r '.candidates[0].content.parts[0].text' | jq -e . > /dev/null 2>&1; then
  echo "✅ Valid JSON response from Gemini"
else
  echo "❌ Invalid JSON response from Gemini"
  exit 1
fi
