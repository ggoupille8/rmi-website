#!/bin/bash
# Smoke Test Script for RMI LLC Website
# Tests critical API endpoints on both apex and www domains

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}🧪 Running Smoke Tests...${NC}"
echo "=================================================="

# Test data
TIMESTAMP=$(date +%s)000
TEST_BODY=$(cat <<EOF
{
  "name": "Smoke Test User",
  "company": "Smoke Test Company",
  "email": "smoke-test@example.com",
  "phone": "555-123-4567",
  "message": "This is an automated smoke test. Please ignore.",
  "serviceType": "installation",
  "timestamp": "$TIMESTAMP"
}
EOF
)

TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: www.rmi-llc.net (canonical domain)
echo -e "\n${YELLOW}[1/2] Testing www.rmi-llc.net/api/quote...${NC}"

if RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$TEST_BODY" \
    "https://www.rmi-llc.net/api/quote" 2>&1); then
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if echo "$BODY" | grep -q '"ok":true'; then
        echo -e "   ${GREEN}✓ PASS: www domain returned ok: true${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "   ${RED}✗ FAIL: www domain returned ok: false${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "   ${RED}✗ FAIL: www domain request failed${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 2: rmi-llc.net (apex domain - should redirect)
echo -e "\n${YELLOW}[2/2] Testing rmi-llc.net/api/quote (with redirect handling)...${NC}"

if RESPONSE=$(curl -s -L -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$TEST_BODY" \
    "https://rmi-llc.net/api/quote" 2>&1); then
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if echo "$BODY" | grep -q '"ok":true'; then
        echo -e "   ${GREEN}✓ PASS: apex domain returned ok: true (redirect handled)${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "   ${RED}✗ FAIL: apex domain returned ok: false${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "   ${RED}✗ FAIL: apex domain request failed${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Summary
echo ""
echo "=================================================="
echo -e "${YELLOW}Test Summary:${NC}"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "  ${GREEN}Failed: $TESTS_FAILED${NC}"
else
    echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
fi

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All smoke tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some smoke tests failed!${NC}"
    exit 1
fi
