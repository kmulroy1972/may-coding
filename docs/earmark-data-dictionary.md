# Federal Earmark Database - Data Dictionary

## Overview
This document provides comprehensive information about the federal earmark database schema, column meanings, typical values, and how users commonly reference this data when asking questions.

## Table: earmarks

### Primary Identification Fields

**id** (integer)
- Purpose: Unique record identifier
- Usage: Internal database key, not typically referenced by users

**created_at** (timestamp)
- Purpose: When the record was added to the database
- Usage: Internal tracking, not typically queried by users

### Temporal Fields

**year** (integer)
- Purpose: Federal Fiscal Year (FY) of the appropriation, NOT calendar year
- Values: 2022, 2023, 2024 (current data range)
- Important: Federal fiscal year runs October 1 - September 30 (e.g., FY2023 = Oct 1, 2022 - Sep 30, 2023)
- User References: "FY2023", "in 2023", "last year's funding", "2022 earmarks"
- Query Examples: "Show me 2023 earmarks", "What happened in FY2024?"

### Agency and Organizational Fields

**agency** (text)
- Purpose: The overall federal department that oversees the agency that will administer and govern the earmark
- Format: Always stored as "Department of X" (e.g., "Department of Transportation")
- Role: This is the cabinet-level department, not the specific operating agency
- Common Values:
  - Department of Transportation (oversees FHWA, FAA, etc.)
  - Department of Labor (oversees various workforce agencies)
  - Department of Health and Human Services (oversees CDC, FDA, etc.)
  - Department of Housing and Urban Development
  - Department of Education
  - Department of Defense
- User References: Often abbreviated as "DOT", "HUD", "HHS", "DOE", "DOD", or just "Transportation"
- Query Examples: "DOT funding", "Department of Labor earmarks", "defense spending"

**subunit** (text, nullable)
- Purpose: The actual agency within the department that oversees the account that will fund the earmark
- Role: This is the operating agency that will administer the funding (subordinate to the department)
- Examples: 
  - "Federal Highway Administration" (within Department of Transportation)
  - "Employment and Training Administration" (within Department of Labor)
  - "Corps of Engineers" (within Department of Defense)
- User References: Often use acronyms like "FHWA", "Corps", "ETA", "FDA"
- Query Examples: "Corps of Engineers projects", "FHWA funding", "ETA workforce programs"

**subcommittee** (text, nullable)
- Purpose: Refers to the House and Senate Appropriations subcommittees that have jurisdiction over this funding
- Role: These subcommittees write the appropriations bills that contain the earmarks
- Examples: "Transportation, Housing and Urban Development", "Labor, Health and Human Services, Education"
- User References: Acronyms like "THUD", "LHHS", "MILCON-VA"
- Query Examples: "THUD subcommittee earmarks", "defense appropriations"

**account** (text, nullable)
- Purpose: These are the specific budget accounts that fund the earmark
- Role: The actual funding mechanism/appropriation account within the agency budget
- Examples: "Community Development Fund", "Highway Infrastructure Programs", "Job Training Programs"
- User References: "RDP account", "infrastructure account", specific account names
- Query Examples: "community development funding", "highway program earmarks"

**budget_number** (text, nullable)
- Purpose: Treasury Symbol identifier for accounting (Column G - purpose unknown)
- Usage: Rarely directly queried by users, mainly for budget tracking
- Note: The specific purpose/meaning of this field needs clarification

**budget_function** (text, nullable)
- Purpose: OMB functional classification for spending category
- Examples: 
  - "Education, Training, Employment and Social Services"
  - "Transportation" 
  - "Health"
  - "Community and Regional Development"
- User References: Called "categories", "sectors", "functional areas"
- Query Examples: "education funding", "health projects", "transportation earmarks"

### Recipient and Funding Fields

**recipient** (text)
- Purpose: This is a combination of the name of the recipient and the project description
- Examples: "City of Madison, WI for downtown infrastructure improvements", "Rutgers University for workforce training center", "Metro Transit Authority bus rapid transit expansion"
- Types: Cities, counties, universities, nonprofits, transit authorities, hospitals + project description
- User References: "who got the money", "recipients", specific organization names, project types
- Query Examples: "university funding", "city projects", "transit earmarks", "infrastructure improvements"

**amount** (integer)
- Purpose: Dollar amount of the earmark in nominal dollars
- Format: Stored as integers without commas (e.g., 1500000 for $1.5 million)
- Range: Typically $50,000 to $10+ million
- User References: "largest earmarks", "projects over $1 million", "total funding"
- Query Examples: "earmarks over $5 million", "largest projects", "total spending"

### Geographic Fields

**location** (text)
- Purpose: Two-letter state/territory postal code
- Values: "CA", "NY", "TX", "FL", "PR" (Puerto Rico), "DC", etc.
- User References: Full state names like "California", "New York", "Texas"
- Query Examples: "California earmarks", "projects in New York", "Texas funding"

### Political Fields

**member** (text, nullable)
- Purpose: This includes the House and/or Senate members that requested the funding
- Format: "Sen. [Last Name]" or "Rep. [Last Name] (STATE-DISTRICT)"
- Multiple Requestors: Sometimes there are more than 1 requestors listed
- Examples: "Sen. Warren", "Rep. Pelosi (CA-12)", "Sen. Smith, Rep. Jones (TX-05)"
- User References: "Senator Warren", "Representative Smith", "Congressman Jones", "delegation"
- Query Examples: "Warren's earmarks", "what did Senator X request", "California delegation", "bipartisan requests"

## Federal Government Organizational Hierarchy

Understanding the relationship between the different organizational levels:

1. **Department** (agency field): Cabinet-level department (e.g., Department of Transportation)
2. **Agency** (subunit field): Operating agency within the department (e.g., Federal Highway Administration)
3. **Account** (account field): Specific budget appropriation account (e.g., Highway Infrastructure Programs)
4. **Subcommittee** (subcommittee field): Congressional appropriations subcommittee with jurisdiction

**Example Flow:**
- Department of Transportation (cabinet department)
  - Federal Highway Administration (operating agency)
    - Highway Infrastructure Programs (budget account)
      - Transportation, Housing and Urban Development Subcommittee (congressional oversight)

## Common Query Patterns

### By Dollar Amount
- "Show me earmarks over $1 million"
- "What are the largest projects?"
- "Total funding for education"
- "Average earmark size"

### By Geographic Location
- "California earmarks"
- "Projects in Texas"
- "West Coast funding"
- "Rural state earmarks"

### By Agency/Department
- "Transportation earmarks"
- "DOT funding"
- "Department of Education projects"
- "Defense spending"

### By Time Period
- "2023 earmarks"
- "FY2024 funding"
- "Recent projects"
- "Year-over-year comparison"

### By Recipient Type
- "University earmarks"
- "City projects"
- "Hospital funding"
- "Transit earmarks"

### By Congressional Member
- "Senator Smith's earmarks"
- "What did Representative Jones request?"
- "California delegation projects"

### By Project Category
- "Infrastructure projects"
- "Healthcare earmarks"
- "Education funding"
- "Community development"

## Data Quality Notes

### Completeness
- All records have: year, agency, recipient, amount, location
- Optional fields may be null: subunit, subcommittee, account, budget_function, member
- Member field is more complete for recent years (2023-2024)

### Formatting Consistency
- Agencies always include "Department of" prefix
- Location codes are standardized postal abbreviations
- Member names follow consistent "Sen./Rep. LastName" format
- Dollar amounts are stored as integers (no commas or decimal points)

### Common Variations
- Users may refer to agencies by abbreviations or full names
- State references can be full names or abbreviations
- Year references may include "FY" prefix or not
- Member names may include titles or be referenced informally

## Tips for Query Interpretation

1. **Agency Matching**: Always add "Department of" when matching agency names
2. **State Conversion**: Convert full state names to postal codes for location matching
3. **Member Formatting**: Handle various title formats (Sen./Senator, Rep./Representative)
4. **Amount Parsing**: Convert "million" references to actual numbers (e.g., "2 million" = 2000000)
5. **Keyword Expansion**: Look across multiple fields (recipient, budget_function, account) for topical queries
6. **Partial Matching**: Use case-insensitive partial matching for names and descriptions