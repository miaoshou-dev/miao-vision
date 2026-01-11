# SQL Snippets User Guide

SQL Snippets help you write SQL queries faster by providing reusable templates with parameter substitution. Instead of writing common patterns from scratch, you can insert pre-built snippets and fill in the parameters.

## Table of Contents

- [What are SQL Snippets?](#what-are-sql-snippets)
- [Quick Start](#quick-start)
- [Built-in Snippets](#built-in-snippets)
- [Using Snippets](#using-snippets)
- [Creating Custom Snippets](#creating-custom-snippets)
- [Managing Snippets](#managing-snippets)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Import/Export](#importexport)
- [Best Practices](#best-practices)

---

## What are SQL Snippets?

SQL Snippets are reusable SQL templates with parameter placeholders. When you insert a snippet, you fill in the parameters with your specific values, and the template expands into complete SQL code.

**Example:**

Instead of writing this from scratch:
```sql
SELECT
  date,
  revenue,
  LAG(revenue, 7) OVER (ORDER BY date) as prev_week_revenue,
  ROUND(100.0 * (revenue - LAG(revenue, 7) OVER (ORDER BY date)) /
    LAG(revenue, 7) OVER (ORDER BY date), 2) as wow_growth_pct
FROM sales
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY date
```

You can use the "Week-over-Week Growth" snippet and just fill in:
- `metric_column` → `revenue`
- `table_name` → `sales`
- `date_column` → `date`

---

## Quick Start

### Method 1: Autocomplete (Fastest)

1. In the SQL editor, start typing a trigger word like `wow`
2. Press `Tab` or `Enter` to select the snippet from autocomplete
3. Fill in the parameters using `Tab` to jump between them
4. Press `Tab` after the last parameter to finish

### Method 2: Snippet Manager

1. Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) to open Snippet Manager
2. Browse or search for a snippet
3. Click **Insert**
4. Fill in the parameter values in the dialog
5. Click **Insert Snippet**

### Method 3: Snippets Button

1. Click the **Snippets** button in the query toolbar
2. Same as Method 2 above

---

## Built-in Snippets

Miaoshou Vision includes 12 built-in snippets covering common BI analysis patterns:

### Time Series Analysis

#### Week-over-Week Growth
- **Trigger:** `wow`
- **Description:** Calculate WoW % change for a metric
- **Use case:** Comparing metrics week-by-week to identify trends

#### Month-over-Month Growth
- **Trigger:** `mom`
- **Description:** Calculate MoM % change for a metric
- **Use case:** Monthly performance tracking

#### 7-Day Moving Average
- **Trigger:** `ma7`
- **Description:** Calculate rolling 7-day average
- **Use case:** Smoothing out daily fluctuations in metrics

#### 30-Day Moving Average
- **Trigger:** `ma30`
- **Description:** Calculate rolling 30-day average
- **Use case:** Long-term trend analysis

### Window Functions

#### Rank by Category
- **Trigger:** `rank`
- **Description:** Assign ranks within each category
- **Use case:** Finding top N items per category

#### Running Total
- **Trigger:** `running`
- **Description:** Calculate cumulative sum
- **Use case:** YTD revenue, cumulative signups

#### LAG (Previous Period)
- **Trigger:** `lag`
- **Description:** Access previous row's value
- **Use case:** Period-over-period comparisons

### Aggregation

#### Group By with Aggregates
- **Trigger:** `groupby`
- **Description:** Group data with common aggregates
- **Use case:** Standard reporting aggregations

### Data Quality

#### NULL Check
- **Trigger:** `nullcheck`
- **Description:** Find records with missing required fields
- **Use case:** Data quality audits

#### Duplicate Detection
- **Trigger:** `dupes`
- **Description:** Find duplicate records
- **Use case:** Data cleaning

### Statistical

#### Percentile Calculation
- **Trigger:** `percentile`
- **Description:** Calculate percentile values (P50, P95, P99)
- **Use case:** Distribution analysis, SLA monitoring

### Date Manipulation

#### Date Range Filter
- **Trigger:** `daterange`
- **Description:** Filter by date range with common presets
- **Use case:** Time-based filtering

---

## Using Snippets

### From Autocomplete

1. Start typing in the SQL editor
2. Snippet suggestions appear automatically
3. Snippets show with category icon and description
4. Select with `↑` `↓` arrow keys and `Enter`, or click
5. Fill parameters with `Tab` to navigate

**Trigger Words:**
- Type trigger words like `wow`, `mom`, `ma7` for quick access
- Snippet expands immediately when selected

### From Snippet Manager

1. Open with `⌘K` / `Ctrl+K` or click **Snippets** button
2. **Browse Tab:** All snippets organized by category
3. **Favorites Tab:** Your starred snippets
4. **Recent Tab:** Recently used snippets
5. **Custom Tab:** Snippets you created

**Search & Filter:**
- Search bar: Search by name, description, or tags
- Category dropdown: Filter by category (Time Series, Window Function, etc.)
- Clear search: Click `×` in search box

**Insert a Snippet:**
1. Find the snippet you want
2. Click **Insert** button
3. Parameter dialog appears
4. Fill in each parameter:
   - **Name:** Parameter identifier (read-only)
   - **Value:** Your specific value
   - **Type:** Hint for what kind of value is expected
5. Click **Insert Snippet**

**Snippet Actions:**
- **Favorite (⭐):** Mark frequently used snippets
- **Edit (✏️):** Edit custom snippets (custom only)
- **Delete (🗑️):** Remove custom snippets (custom only)

---

## Creating Custom Snippets

Create your own reusable SQL patterns!

### Step-by-Step Guide

1. **Open Snippet Manager** (`⌘K`)
2. **Click "Create Snippet"** button (or press `⌘N`)
3. **Fill in Basic Information:**
   - **Name:** Descriptive name (e.g., "User Retention Cohort")
   - **Description:** What does this snippet do?
   - **Category:** Choose appropriate category
   - **Trigger Word:** Optional shortcut (e.g., `retention`)
   - **Tags:** Add searchable tags

4. **Write SQL Template:**
   - Use `${paramName}` for parameters
   - Example:
     ```sql
     SELECT
       ${cohort_column},
       COUNT(DISTINCT ${user_id_column}) as users,
       COUNT(DISTINCT CASE WHEN ${event_column} = '${event_name}' THEN ${user_id_column} END) as retained_users
     FROM ${table_name}
     GROUP BY ${cohort_column}
     ```

5. **Auto-detect Parameters:**
   - Click "🔍 Auto-detect Parameters"
   - Parameters are extracted from `${...}` placeholders
   - Or manually add parameters with "+ Add Parameter"

6. **Configure Each Parameter:**
   - **Name:** Must match placeholder in template
   - **Description:** Help text for users
   - **Type:** String, Number, Column, Table, Date, or Enum
   - **Placeholder:** Example value
   - **Required:** Whether parameter is mandatory

7. **Preview:**
   - Right panel shows live preview
   - Fill in test values to see generated SQL
   - Verify snippet looks correct

8. **Save:**
   - Click "Create Snippet" (or press `⌘S`)
   - Snippet appears in "Custom" tab
   - Ready to use immediately!

### Template Syntax

Use `${parameterName}` for parameters:

```sql
SELECT
  ${column_name},
  COUNT(*) as count
FROM ${table_name}
WHERE ${filter_condition}
GROUP BY ${column_name}
ORDER BY count DESC
LIMIT ${limit}
```

**Tips:**
- Use descriptive parameter names
- Parameters can be reused multiple times
- Parameters are replaced with exact values (no quotes added automatically)
- For string values, include quotes in the parameter value

---

## Managing Snippets

### Favorites

Mark snippets you use frequently:
- Click the **star icon** (☆) on any snippet
- Access all favorites in the **Favorites** tab
- Favorites show first in autocomplete

### Editing Custom Snippets

1. Go to **Custom** tab
2. Find your snippet
3. Click **Edit** button (✏️)
4. Make changes in the editor
5. Click **Update Snippet**

### Deleting Custom Snippets

1. Go to **Custom** tab
2. Find snippet to delete
3. Click **Delete** button (🗑️)
4. Confirm deletion

**Note:** Built-in snippets cannot be edited or deleted.

### Statistics

View snippet usage analytics:
- **Usage Count:** How many times snippet was used
- **Last Used:** When it was last inserted
- **Popular Snippets:** Sorted by usage count

---

## Keyboard Shortcuts

### Global (SQL Workspace)

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Snippet Manager |
| `⌘Enter` / `Ctrl+Enter` | Run query |
| `⌘Shift+Enter` / `Ctrl+Shift+Enter` | Run selection |
| `⌘T` / `Ctrl+T` | New tab |
| `⌘W` / `Ctrl+W` | Close tab |

### In Snippet Manager

| Shortcut | Action |
|----------|--------|
| `Esc` | Close manager |
| `⌘F` / `Ctrl+F` | Focus search box |
| `⌘N` / `Ctrl+N` | Create new snippet |

### In Snippet Editor

| Shortcut | Action |
|----------|--------|
| `Esc` | Close editor (cancel) |
| `⌘S` / `Ctrl+S` | Save snippet |

### In SQL Editor (Autocomplete)

| Shortcut | Action |
|----------|--------|
| `↑` `↓` | Navigate suggestions |
| `Tab` / `Enter` | Select snippet |
| `Tab` | Next parameter |
| `Shift+Tab` | Previous parameter |

---

## Import/Export

### Export Snippets

Share your custom snippets or create backups:

1. Open Snippet Manager
2. Click **Import/Export** button
3. Click **Export Snippets**
4. JSON file downloads with all your custom snippets
5. Share with team or save for backup

### Import Snippets

Add snippets from others or restore from backup:

1. Open Snippet Manager
2. Click **Import/Export** button
3. Click **Import Snippets**
4. Select JSON file
5. Snippets are added to your Custom collection

**Import Behavior:**
- Duplicate IDs are skipped (won't override existing)
- Maximum 100 custom snippets total
- Imported snippets become custom (not built-in)

---

## Best Practices

### 1. Use Descriptive Names
**Good:** "User Retention by Cohort Week"
**Bad:** "Query 1"

### 2. Add Helpful Descriptions
Explain what the snippet does and when to use it.

### 3. Tag Appropriately
Use tags like `retention`, `revenue`, `cohort` for easy searching.

### 4. Set Clear Parameter Names
**Good:** `metric_column`, `start_date`, `user_id_column`
**Bad:** `col1`, `x`, `param`

### 5. Provide Placeholders
Help users understand what values to enter:
```
Parameter: start_date
Placeholder: 2024-01-01
```

### 6. Choose Right Category
- **Time Series:** WoW, MoM, trends, moving averages
- **Window Function:** Ranking, running totals, LAG/LEAD
- **Aggregation:** GROUP BY with SUM/AVG/COUNT
- **Cohort:** User retention, cohort analysis
- **Statistical:** Percentiles, distributions, correlations
- **Data Quality:** NULL checks, duplicates, validation
- **Custom:** Your specific use cases

### 7. Test Your Snippets
Always preview with real parameter values before saving.

### 8. Keep Templates Flexible
Design snippets to work with multiple tables/scenarios:
```sql
-- Good: Flexible
SELECT ${column} FROM ${table} WHERE ${condition}

-- Less flexible: Hard-coded table
SELECT ${column} FROM users WHERE ${condition}
```

### 9. Document Complex Logic
Use SQL comments in templates to explain complex parts:
```sql
-- Calculate rolling 7-day average
SELECT
  date,
  ${metric},
  AVG(${metric}) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as ma7_${metric}
FROM ${table}
```

### 10. Share Useful Snippets
Export and share helpful snippets with your team!

---

## Tips & Tricks

### Quick Insert from Autocomplete
Type trigger word → `Tab` → Fill parameters → `Tab` through fields → Done!

### Favorite Your Top 5
Mark your most-used snippets as favorites for quick access.

### Combine Snippets with CTEs
Use snippets as building blocks in larger queries:
```sql
WITH weekly_growth AS (
  -- Insert "wow" snippet here
  ...
),
monthly_growth AS (
  -- Insert "mom" snippet here
  ...
)
SELECT * FROM weekly_growth
JOIN monthly_growth USING (date)
```

### Create Project-Specific Snippets
Build snippets for your specific schema:
- Common JOINs between your tables
- Frequently used WHERE clauses
- Standard report formats

### Use Snippets for Documentation
Create snippets with example queries as documentation.

---

## Troubleshooting

### Autocomplete Not Showing Snippets

1. Make sure you're in the SQL editor
2. Start typing (at least 2 characters)
3. Check if Monaco Editor loaded correctly

### Parameter Dialog Empty

1. Verify snippet has parameters defined
2. Check template uses `${paramName}` syntax
3. Try "Auto-detect Parameters" in editor

### Can't Edit Built-in Snippet

Built-in snippets are read-only. Instead:
1. Insert the built-in snippet
2. Copy the SQL
3. Create a new custom snippet with the SQL
4. Edit the custom version

### Import Failed

Common issues:
- File is not valid JSON
- Missing required fields (name, template, etc.)
- Already at 100 custom snippets limit

### Snippet Not in Autocomplete

Check:
1. Snippet has a trigger word set
2. You're typing the trigger word correctly
3. Try opening Snippet Manager to verify it exists

---

## Examples

### Example 1: Week-over-Week Revenue Growth

**Scenario:** Compare this week's revenue to last week

1. Type `wow` in SQL editor
2. Select "Week over Week Growth" from autocomplete
3. Fill parameters:
   - `metric_column`: `revenue`
   - `table_name`: `daily_sales`
   - `date_column`: `sale_date`
4. Press Tab after last parameter

**Generated SQL:**
```sql
SELECT
  sale_date,
  revenue,
  LAG(revenue, 7) OVER (ORDER BY sale_date) as prev_week_revenue,
  ROUND(100.0 * (revenue - LAG(revenue, 7) OVER (ORDER BY sale_date)) /
    LAG(revenue, 7) OVER (ORDER BY sale_date), 2) as wow_growth_pct
FROM daily_sales
WHERE sale_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY sale_date
```

### Example 2: Top 10 Products per Category

**Scenario:** Find best-selling products in each category

1. Press `⌘K` to open Snippet Manager
2. Type "rank" in search
3. Select "Rank by Category"
4. Click **Insert**
5. Fill parameters:
   - `table_name`: `product_sales`
   - `partition_column`: `category`
   - `order_column`: `total_revenue`
   - `order_direction`: `DESC`

**Generated SQL:**
```sql
SELECT *,
  RANK() OVER (
    PARTITION BY category
    ORDER BY total_revenue DESC
  ) as rank_in_category
FROM product_sales
QUALIFY rank_in_category <= 10
```

### Example 3: Custom Cohort Analysis Snippet

**Creating a reusable cohort snippet:**

1. Click **Create Snippet** in manager
2. Fill in:
   - **Name:** "Weekly User Retention Cohort"
   - **Description:** "Calculate week-by-week user retention"
   - **Category:** `cohort`
   - **Trigger:** `cohort`
3. Template:
```sql
WITH cohorts AS (
  SELECT
    ${user_id},
    DATE_TRUNC('week', ${signup_date}) as cohort_week
  FROM ${users_table}
),
activity AS (
  SELECT
    ${user_id},
    DATE_TRUNC('week', ${activity_date}) as activity_week
  FROM ${events_table}
  WHERE ${event_type} = '${active_event}'
)
SELECT
  c.cohort_week,
  DATE_DIFF('week', c.cohort_week, a.activity_week) as weeks_since_signup,
  COUNT(DISTINCT c.${user_id}) as cohort_size,
  COUNT(DISTINCT a.${user_id}) as retained_users,
  ROUND(100.0 * COUNT(DISTINCT a.${user_id}) / COUNT(DISTINCT c.${user_id}), 2) as retention_pct
FROM cohorts c
LEFT JOIN activity a ON c.${user_id} = a.${user_id}
GROUP BY c.cohort_week, weeks_since_signup
ORDER BY c.cohort_week, weeks_since_signup
```
4. Click "Auto-detect Parameters"
5. Add descriptions for each parameter
6. Save!

Now you can quickly analyze user retention by typing `cohort` + Tab!

---

## FAQs

**Q: Can I edit built-in snippets?**
A: No, but you can create a custom snippet based on a built-in one.

**Q: How many custom snippets can I create?**
A: Maximum 100 custom snippets.

**Q: Are snippets stored in the cloud?**
A: No, snippets are stored in browser localStorage. Use Export to backup.

**Q: Can I share snippets with my team?**
A: Yes! Export your custom snippets as JSON and share the file. Team members can import it.

**Q: Do parameters support default values?**
A: Yes, set `defaultValue` when creating parameters.

**Q: Can parameters have validation?**
A: Yes, you can set `pattern` (regex) and `validationMessage` for custom validation.

**Q: What happens if I use the same parameter name twice?**
A: The same value will be substituted in both places.

**Q: Can snippets reference other snippets?**
A: Not directly, but you can copy SQL from one snippet and use it in another.

**Q: Will autocomplete work if I don't set a trigger word?**
A: Yes! Snippets show in autocomplete based on name and tags too.

**Q: Can I use SQL comments in templates?**
A: Yes, comments are preserved in the template.

---

## Advanced Topics

### Parameter Types

Each parameter type provides hints for the UI:

- **string:** Free-form text (default)
- **number:** Numeric values
- **column:** Column names (could enable autocomplete in future)
- **table:** Table names (could enable autocomplete in future)
- **date:** Date values (could show date picker in future)
- **enum:** Predefined options (set via `options` field)

### Enum Parameters

For parameters with fixed choices:

```javascript
{
  name: "direction",
  type: "enum",
  options: ["ASC", "DESC"],
  description: "Sort direction"
}
```

### Validation Patterns

Add regex validation to parameters:

```javascript
{
  name: "email",
  type: "string",
  pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
  validationMessage: "Invalid email format"
}
```

### Multi-line Templates

Templates support multi-line SQL with proper formatting:

```sql
SELECT
  ${column1},
  ${column2},
  ${column3}
FROM ${table}
WHERE ${condition1}
  AND ${condition2}
ORDER BY ${column1} DESC
LIMIT ${limit}
```

---

## Getting Help

- **Documentation:** This guide
- **Implementation Details:** See `docs/SQL_SNIPPETS_IMPLEMENTATION.md`
- **Type Definitions:** See `src/types/snippet.ts`
- **Built-in Snippets:** See `src/core/snippets/built-in-snippets.ts`

---

**Happy Querying! 🚀**
