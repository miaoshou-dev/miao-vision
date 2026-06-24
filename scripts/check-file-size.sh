#!/bin/bash

# File Size Check Script
# Ensures no source files exceed the 500 line limit
# Usage: npm run check:size

echo "Checking file sizes in apps/web/src, packages/*/src..."
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

error_count=0
warning_count=0
total_count=0

# Create temp file for results
tmpfile=$(mktemp)

# Find all .ts and .svelte files (excluding test files for error check)
while IFS= read -r file; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    total_count=$((total_count + 1))

    # Skip test files for strict limit
    is_test=0
    if [[ "$file" == *".test.ts" || "$file" == *".spec.ts" ]]; then
      is_test=1
    fi

    if [ $lines -gt 500 ] && [ $is_test -eq 0 ]; then
      echo -e "${RED}ERROR${NC} $file ($lines lines)" >> "$tmpfile"
      error_count=$((error_count + 1))
    elif [ $lines -gt 400 ] && [ $is_test -eq 0 ]; then
      echo -e "${YELLOW}WARN ${NC} $file ($lines lines)" >> "$tmpfile"
      warning_count=$((warning_count + 1))
    fi
  fi
done < <(find apps/web/src packages -path "*/src/*" -type f \( -name "*.ts" -o -name "*.svelte" \) -not -path "*/node_modules/*")

# Print results
if [ -s "$tmpfile" ]; then
  echo -e "${BLUE}Files requiring attention:${NC}"
  echo ""
  cat "$tmpfile"
  echo ""
fi

rm -f "$tmpfile"

# Summary
echo "---"
echo -e "Total files checked: ${BLUE}$total_count${NC}"

if [ $error_count -gt 0 ]; then
  echo -e "${RED}Files over 500 lines: $error_count${NC}"
fi

if [ $warning_count -gt 0 ]; then
  echo -e "${YELLOW}Files over 400 lines: $warning_count${NC}"
fi

if [ $error_count -eq 0 ] && [ $warning_count -eq 0 ]; then
  echo -e "${GREEN}All files within size limits!${NC}"
fi

echo ""

# Exit with error if any files exceed 500 lines
if [ $error_count -gt 0 ]; then
  echo -e "${RED}FAILED: $error_count file(s) exceed 500 line limit${NC}"
  echo "Please split large files into smaller modules."
  exit 1
fi

echo -e "${GREEN}PASSED${NC}"
exit 0
