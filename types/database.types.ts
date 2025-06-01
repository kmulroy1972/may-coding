/* ────────────────────── Enhanced Sample Queries & Templates ─────────────────── */

export interface QueryTemplate {
    id: string;
    category: QueryCategory;
    intent: QueryIntent;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    template: string;
    description: string;
    examples: string[];
    expectedFilters: string[];
    tips?: string[];
    relatedQueries?: string[];
  }
  
  export type QueryCategory = 
    | 'basic_search'
    | 'member_analysis'
    | 'agency_analysis'
    | 'geographic_analysis'
    | 'temporal_analysis'
    | 'comparative_analysis'
    | 'financial_analysis'
    | 'trend_analysis'
    | 'complex_research';
  
  export type QueryIntent = 
    | 'search'
    | 'list'
    | 'analyze'
    | 'compare'
    | 'summarize'
    | 'trend'
    | 'explore';
  
  /* ────────────────────── Query Templates by Category ─────────────────── */
  
  export const QUERY_TEMPLATES: QueryTemplate[] = [
    // Basic Search Queries
    {
      id: 'basic_agency_search',
      category: 'basic_search',
      intent: 'search',
      difficulty: 'beginner',
      template: 'Show me earmarks from {agency}',
      description: 'Find all earmarks from a specific federal agency',
      examples: [
        'Show me earmarks from Department of Labor',
        'Show me earmarks from Transportation',
        'Show me earmarks from HUD'
      ],
      expectedFilters: ['agency'],
      tips: [
        'You can use full department names or abbreviations',
        'Common abbreviations: DOL (Labor), DOT (Transportation), HUD (Housing)'
      ],
      relatedQueries: [
        'Show me {agency} earmarks over $1 million',
        'Compare {agency} earmarks between years'
      ]
    },
  
    {
      id: 'basic_year_search',
      category: 'basic_search',
      intent: 'search',
      difficulty: 'beginner',
      template: 'Show me earmarks from {year}',
      description: 'Find all earmarks from a specific fiscal year',
      examples: [
        'Show me earmarks from 2023',
        'Show me earmarks from FY2024',
        'List all earmarks from 2022'
      ],
      expectedFilters: ['year'],
      tips: [
        'Use fiscal years (FY2022, FY2023, FY2024)',
        'Federal fiscal year runs October 1 - September 30'
      ],
      relatedQueries: [
        'Compare earmarks between {year} and {year}',
        'Show trends from 2022 to 2024'
      ]
    },
  
    {
      id: 'basic_location_search',
      category: 'geographic_analysis',
      intent: 'search',
      difficulty: 'beginner',
      template: 'Show me earmarks in {location}',
      description: 'Find earmarks by geographic location',
      examples: [
        'Show me earmarks in California',
        'Show me earmarks in Texas',
        'List earmarks in New York'
      ],
      expectedFilters: ['location'],
      tips: [
        'Use full state names or abbreviations (CA, TX, NY)',
        'Include major cities or regions for more specific results'
      ],
      relatedQueries: [
        'Compare {state} earmarks with {state}',
        'Show {state} earmarks by agency'
      ]
    },
  
    // Member Analysis Queries
    {
      id: 'member_earmarks',
      category: 'member_analysis',
      intent: 'search',
      difficulty: 'intermediate',
      template: 'Show me earmarks secured by {member}',
      description: 'Find earmarks associated with a specific Congressional member',
      examples: [
        'Show me earmarks secured by Senator Menendez',
        'Show me earmarks from Representative Smith',
        'List earmarks by Congressman Johnson'
      ],
      expectedFilters: ['member'],
      tips: [
        'Use last names only for better results',
        'Include titles (Senator, Representative) for clarity'
      ],
      relatedQueries: [
        'Compare {member} with other {state} representatives',
        'Show {member} earmarks by agency'
      ]
    },
  
    {
      id: 'member_agency_analysis',
      category: 'member_analysis',
      intent: 'analyze',
      difficulty: 'intermediate',
      template: 'Analyze {member} earmarks in {agency}',
      description: 'Examine a member\'s earmarks within a specific agency',
      examples: [
        'Analyze Senator Warren earmarks in Department of Education',
        'Show Representative Garcia Transportation earmarks',
        'Examine Menendez Labor Department funding'
      ],
      expectedFilters: ['member', 'agency'],
      tips: [
        'Combines member and agency analysis',
        'Good for understanding member priorities'
      ]
    },
  
    // Financial Analysis Queries
    {
      id: 'large_earmarks',
      category: 'financial_analysis',
      intent: 'list',
      difficulty: 'beginner',
      template: 'Show me earmarks over ${amount}',
      description: 'Find earmarks above a specific dollar threshold',
      examples: [
        'Show me earmarks over $5 million',
        'Show me earmarks over $1M',
        'List earmarks above $10 million'
      ],
      expectedFilters: ['minAmount'],
      tips: [
        'Use abbreviations: $1M (million), $5K (thousand)',
        'Results are sorted by amount (highest first)'
      ],
      relatedQueries: [
        'Show largest earmarks by agency',
        'Compare large earmarks across years'
      ]
    },
  
    {
      id: 'amount_range',
      category: 'financial_analysis',
      intent: 'search',
      difficulty: 'intermediate',
      template: 'Show me earmarks between ${min} and ${max}',
      description: 'Find earmarks within a specific amount range',
      examples: [
        'Show me earmarks between $1 million and $5 million',
        'Show me earmarks between $500K and $2M',
        'List earmarks from $100K to $1M'
      ],
      expectedFilters: ['minAmount', 'maxAmount'],
      tips: [
        'Good for finding medium-sized projects',
        'Helps avoid outliers in analysis'
      ]
    },
  
    // Comparative Analysis Queries
    {
      id: 'agency_comparison',
      category: 'comparative_analysis',
      intent: 'compare',
      difficulty: 'intermediate',
      template: 'Compare {agency} and {agency} earmarks',
      description: 'Compare earmark allocations between two agencies',
      examples: [
        'Compare Transportation and Education earmarks',
        'Compare Labor and HHS earmarks',
        'Compare Defense and Veterans Affairs funding'
      ],
      expectedFilters: ['agency'],
      tips: [
        'Shows side-by-side analysis',
        'Includes totals, averages, and trends'
      ]
    },
  
    {
      id: 'year_comparison',
      category: 'temporal_analysis',
      intent: 'compare',
      difficulty: 'intermediate',
      template: 'Compare earmarks between {year} and {year}',
      description: 'Compare earmark patterns across different fiscal years',
      examples: [
        'Compare earmarks between 2022 and 2024',
        'Compare 2023 vs 2024 earmarks',
        'Show changes from FY2022 to FY2023'
      ],
      expectedFilters: ['year'],
      tips: [
        'Reveals year-over-year changes',
        'Shows growth or decline patterns'
      ]
    },
  
    {
      id: 'state_comparison',
      category: 'geographic_analysis',
      intent: 'compare',
      difficulty: 'intermediate',
      template: 'Compare {state} and {state} earmarks',
      description: 'Compare earmark allocations between states',
      examples: [
        'Compare California and Texas earmarks',
        'Compare New York vs Florida earmarks',
        'Compare Ohio and Pennsylvania funding'
      ],
      expectedFilters: ['location'],
      tips: [
        'Shows per-capita comparisons when possible',
        'Includes breakdown by agency'
      ]
    },
  
    // Trend Analysis Queries
    {
      id: 'agency_trends',
      category: 'trend_analysis',
      intent: 'trend',
      difficulty: 'advanced',
      template: 'Show {agency} earmark trends over time',
      description: 'Analyze how agency earmarks have changed over available years',
      examples: [
        'Show Transportation earmark trends over time',
        'Show Education funding trends',
        'Analyze Labor Department trends from 2022-2024'
      ],
      expectedFilters: ['agency'],
      tips: [
        'Shows year-over-year changes',
        'Identifies growth or decline patterns'
      ]
    },
  
    {
      id: 'state_trends',
      category: 'trend_analysis',
      intent: 'trend',
      difficulty: 'advanced',
      template: 'Show {state} earmark trends over time',
      description: 'Analyze how state earmarks have evolved',
      examples: [
        'Show California earmark trends over time',
        'Analyze Texas funding trends',
        'Show New York earmark changes 2022-2024'
      ],
      expectedFilters: ['location'],
      tips: [
        'Reveals state-level funding patterns',
        'Shows which agencies are growing/shrinking'
      ]
    },
  
    // Complex Research Queries
    {
      id: 'infrastructure_analysis',
      category: 'complex_research',
      intent: 'analyze',
      difficulty: 'advanced',
      template: 'Analyze infrastructure earmarks across {context}',
      description: 'Deep dive into infrastructure-related funding',
      examples: [
        'Analyze infrastructure earmarks across all states',
        'Analyze transportation infrastructure by region',
        'Show infrastructure trends in rural vs urban areas'
      ],
      expectedFilters: ['keywords', 'agency'],
      tips: [
        'Searches across multiple agencies',
        'Identifies infrastructure patterns'
      ]
    },
  
    {
      id: 'research_funding',
      category: 'complex_research',
      intent: 'analyze',
      difficulty: 'advanced',
      template: 'Analyze research and development earmarks',
      description: 'Find and analyze R&D related earmarks across agencies',
      examples: [
        'Analyze research and development earmarks',
        'Show university research funding',
        'Analyze scientific research earmarks'
      ],
      expectedFilters: ['keywords'],
      tips: [
        'Searches recipient names and descriptions',
        'Covers multiple agencies and institutions'
      ]
    }
  ];
  
  /* ────────────────────── Suggested Queries by Context ─────────────────── */
  
  export const CONTEXTUAL_SUGGESTIONS = {
    newUser: [
      'Show me earmarks from Department of Transportation',
      'Show me earmarks over $1 million',
      'Show me earmarks in California',
      'Compare 2023 vs 2024 earmarks'
    ],
  
    afterAgencyQuery: [
      'Show trends for this agency over time',
      'Compare with other similar agencies',
      'Show largest earmarks from this agency',
      'Show this agency\'s earmarks by state'
    ],
  
    afterMemberQuery: [
      'Show other members from this state',
      'Compare with members from other states',
      'Show this member\'s earmarks by agency',
      'Analyze this member\'s funding patterns'
    ],
  
    afterLocationQuery: [
      'Compare with neighboring states',
      'Show earmarks by agency in this state',
      'Show trends for this state over time',
      'Compare rural vs urban earmarks'
    ],
  
    afterLargeResults: [
      'Show only earmarks over $5 million',
      'Group by agency',
      'Show trends over time',
      'Compare top agencies'
    ],
  
    afterSmallResults: [
      'Try broader search terms',
      'Remove specific filters',
      'Search related agencies',
      'Try different time periods'
    ]
  };
  
  /* ────────────────────── Query Enhancement Functions ─────────────────── */
  
  /**
   * Get query suggestions based on user's query history
   */
  export function getQuerySuggestions(
    queryHistory: string[],
    lastResultCount: number,
    userExpertise: 'beginner' | 'intermediate' | 'expert' = 'intermediate'
  ): string[] {
    const suggestions: string[] = [];
    
    // Based on result count
    if (lastResultCount === 0) {
      suggestions.push(...CONTEXTUAL_SUGGESTIONS.afterSmallResults);
    } else if (lastResultCount > 50) {
      suggestions.push(...CONTEXTUAL_SUGGESTIONS.afterLargeResults);
    }
    
    // Based on expertise level
    const relevantTemplates = QUERY_TEMPLATES.filter(template => {
      if (userExpertise === 'beginner') return template.difficulty === 'beginner';
      if (userExpertise === 'expert') return template.difficulty === 'advanced';
      return true; // intermediate users see all
    });
    
    // Add template examples
    const randomTemplates = relevantTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    randomTemplates.forEach(template => {
      suggestions.push(template.examples[0]);
    });
    
    return [...new Set(suggestions)]; // Remove duplicates
  }
  
  /**
   * Get related queries based on current query
   */
  export function getRelatedQueries(currentQuery: string): string[] {
    const lowerQuery = currentQuery.toLowerCase();
    const related: string[] = [];
    
    // Find matching templates
    for (const template of QUERY_TEMPLATES) {
      for (const example of template.examples) {
        if (similarQuery(lowerQuery, example.toLowerCase())) {
          if (template.relatedQueries) {
            related.push(...template.relatedQueries);
          }
        }
      }
    }
    
    return [...new Set(related)].slice(0, 5);
  }
  
  /**
   * Check if two queries are similar
   */
  function similarQuery(query1: string, query2: string): boolean {
    const words1 = new Set(query1.split(/\s+/));
    const words2 = new Set(query2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    // Jaccard similarity
    return intersection.size / union.size > 0.3;
  }
  
  /**
   * Get query templates by category
   */
  export function getTemplatesByCategory(category: QueryCategory): QueryTemplate[] {
    return QUERY_TEMPLATES.filter(template => template.category === category);
  }
  
  /**
   * Get query templates by difficulty
   */
  export function getTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): QueryTemplate[] {
    return QUERY_TEMPLATES.filter(template => template.difficulty === difficulty);
  }
  
  /**
   * Find query template by ID
   */
  export function getTemplateById(id: string): QueryTemplate | undefined {
    return QUERY_TEMPLATES.find(template => template.id === id);
  }
  
  /**
   * Generate example queries for agency
   */
  export function generateAgencyExamples(agency: string): string[] {
    return [
      `Show me earmarks from ${agency}`,
      `Show me ${agency} earmarks over $1 million`,
      `Analyze ${agency} trends over time`,
      `Compare ${agency} with other agencies`,
      `Show largest ${agency} earmarks`
    ];
  }
  
  /**
   * Generate example queries for state
   */
  export function generateStateExamples(state: string): string[] {
    return [
      `Show me earmarks in ${state}`,
      `Show me ${state} earmarks by agency`,
      `Compare ${state} with other states`,
      `Show ${state} earmark trends over time`,
      `Show largest earmarks in ${state}`
    ];
  }
  
  /**
   * Generate example queries for member
   */
  export function generateMemberExamples(member: string): string[] {
    return [
      `Show me earmarks secured by ${member}`,
      `Show me ${member} earmarks by agency`,
      `Analyze ${member} funding patterns`,
      `Compare ${member} with other representatives`,
      `Show ${member} largest earmarks`
    ];
  }
  
  /* ────────────────────── Query Validation & Help ─────────────────── */
  
  /**
   * Validate query and provide suggestions for improvement
   */
  export function validateAndImproveQuery(query: string): {
    isValid: boolean;
    suggestions: string[];
    improvedQuery?: string;
  } {
    const lowerQuery = query.toLowerCase().trim();
    const suggestions: string[] = [];
    
    // Check for common issues
    if (lowerQuery.length < 5) {
      suggestions.push('Try a more specific query with more details');
      return { isValid: false, suggestions };
    }
    
    // Check for recognized patterns
    const hasAgency = /\b(department|labor|education|transportation|defense|health|housing)\b/i.test(query);
    const hasYear = /\b(20\d{2}|fy\s*20\d{2})\b/i.test(query);
    const hasMember = /\b(senator|representative|congressman|congresswoman)\b/i.test(query);
    const hasLocation = /\b(california|texas|new york|florida|ohio|pennsylvania)\b/i.test(query);
    const hasAmount = /\$[\d,]+[kmb]?|\b\d+\s*(million|thousand|billion)\b/i.test(query);
    
    // Provide contextual suggestions
    if (!hasAgency && !hasMember && !hasLocation && !hasYear && !hasAmount) {
      suggestions.push('Try specifying an agency, member, location, year, or amount');
      suggestions.push('Example: "Show me Department of Labor earmarks"');
    }
    
    if (hasAgency && !hasYear) {
      suggestions.push('Consider adding a year for more specific results');
    }
    
    if (hasMember && !hasAgency) {
      suggestions.push('Try adding an agency to see member\'s work in specific departments');
    }
    
    return {
      isValid: true,
      suggestions: suggestions.length > 0 ? suggestions : ['Your query looks good!']
    };
  }
  
  /**
   * Get help text for query construction
   */
  export function getQueryHelp(): string {
    return `
  Query Help Guide:
  
  BASIC SEARCHES:
  • "Show me earmarks from [Agency]" - Find all earmarks from an agency
  • "Show me earmarks in [State]" - Find earmarks by location
  • "Show me earmarks from [Year]" - Find earmarks by fiscal year
  
  MEMBER SEARCHES:
  • "Show me earmarks by Senator [Name]" - Find member's earmarks
  • "Show me [Member] Transportation earmarks" - Member + agency
  
  FINANCIAL SEARCHES:
  • "Show me earmarks over $5 million" - Above threshold
  • "Show me earmarks between $1M and $10M" - Amount range
  
  COMPARATIVE ANALYSIS:
  • "Compare [Agency] and [Agency] earmarks" - Agency comparison
  • "Compare [State] and [State] earmarks" - State comparison
  • "Compare 2022 vs 2024 earmarks" - Year comparison
  
  TREND ANALYSIS:
  • "Show [Agency] trends over time" - Agency trends
  • "Show [State] earmark trends" - State trends
  
  TIPS:
  • Use abbreviations: DOL (Labor), DOT (Transportation), HUD (Housing)
  • Include fiscal years: FY2022, FY2023, FY2024
  • Use amount abbreviations: $1M (million), $500K (thousand)
  • Be specific with member names (last names work best)
  `;
  }
  
  /* ────────────────────── Export All ─────────────────── */
  
  export const sampleQueries = {
    templates: QUERY_TEMPLATES,
    suggestions: CONTEXTUAL_SUGGESTIONS,
    getSuggestions: getQuerySuggestions,
    getRelated: getRelatedQueries,
    validate: validateAndImproveQuery,
    help: getQueryHelp,
    byCategory: getTemplatesByCategory,
    byDifficulty: getTemplatesByDifficulty,
    generateExamples: {
      agency: generateAgencyExamples,
      state: generateStateExamples,
      member: generateMemberExamples
    }
  };
  
  export default sampleQueries;