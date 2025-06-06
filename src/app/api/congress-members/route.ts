import { NextRequest, NextResponse } from 'next/server';

// Congress API Configuration
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';
const API_KEY = process.env.CONGRESS_API_KEY;

interface CongressMember {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: number;
  chamber: 'House of Representatives' | 'Senate';
  officialUrl?: string;
  phone?: string;
  officeAddress?: string;
  imageUrl?: string;
}

async function makeCongressRequest(endpoint: string): Promise<any> {
  console.log('API Key length:', API_KEY ? API_KEY.length : 0);
  console.log('API Key first 4 chars:', API_KEY ? API_KEY.substring(0, 4) : 'none');
  
  if (!API_KEY) {
    throw new Error('Congress API key not configured');
  }

  // Remove any leading slashes from the endpoint
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const url = `${CONGRESS_API_BASE}/${cleanEndpoint}${cleanEndpoint.includes('?') ? '&' : '?'}format=json`;
  
  console.log('Making request to:', url);
  console.log('Request headers:', {
    'X-API-Key': '***' + API_KEY.substring(API_KEY.length - 4),
    'Accept': 'application/json'
  });
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Congress API error response:', errorData);
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Congress API response structure:', {
      hasMembers: !!data.members,
      memberCount: data.members?.length,
      firstMember: data.members?.[0] ? {
        id: data.members[0].bioguideId,
        name: data.members[0].name,
        state: data.members[0].state,
        terms: data.members[0].terms
      } : null
    });
    return data;
  } catch (error) {
    console.error('Congress API request failed:', error);
    throw error;
  }
}

function transformMembers(members: any[]): CongressMember[] {
  if (!Array.isArray(members)) {
    console.error('Expected array of members, got:', members);
    return [];
  }

  return members
    .filter(member => {
      if (!member) {
        console.error('Invalid member data:', member);
        return false;
      }

      // Only include current members
      const isCurrentMember = member.terms?.some((term: any) => {
        const isCurrent = term.congress === '118' && term.endDate === null;
        console.log(`Member ${member.bioguideId} term check:`, { congress: term.congress, endDate: term.endDate, isCurrent });
        return isCurrent;
      });

      if (!isCurrentMember) {
        console.log(`Filtered out non-current member: ${member.bioguideId}`);
      }

      return isCurrentMember;
    })
    .map(member => {
      const transformed = {
        bioguideId: member.bioguideId,
        name: member.name || member.directOrderName || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        party: getPartyName(member.party || member.partyName),
        state: member.state,
        district: member.district,
        chamber: getChamberName(member.terms?.[0]?.chamber || member.chamber),
        officialUrl: member.officialWebsiteUrl,
        phone: member.phone,
        officeAddress: member.address?.officeAddress,
        imageUrl: `https://bioguide.congress.gov/bioguide/photo/${member.bioguideId}.jpg`
      };
      console.log('Transformed member:', transformed);
      return transformed;
    });
}

function getPartyName(party: string): string {
  const partyMap: { [key: string]: string } = {
    'D': 'Democratic',
    'R': 'Republican', 
    'I': 'Independent',
    'ID': 'Independent Democrat',
    'L': 'Libertarian'
  };
  
  return partyMap[party] || party || 'Unknown';
}

function getChamberName(chamber: string): 'House of Representatives' | 'Senate' {
  if (chamber?.toLowerCase().includes('senate')) {
    return 'Senate';
  }
  return 'House of Representatives';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const name = searchParams.get('name');
    const bioguideId = searchParams.get('bioguideId');

    console.log('Request params:', { type, state, district, name, bioguideId });

    // Validate required parameters based on search type
    if (!type) {
      return NextResponse.json(
        { error: 'Search type is required. Use: state, district, name, or details' },
        { status: 400 }
      );
    }

    let results: CongressMember[] = [];

    switch (type) {
      case 'state':
        if (!state) {
          return NextResponse.json(
            { error: 'State parameter is required for state search' },
            { status: 400 }
          );
        }
        
        // Validate state format (2-letter state code)
        if (!/^[A-Z]{2}$/.test(state.toUpperCase())) {
          return NextResponse.json(
            { error: 'State must be a valid 2-letter state code (e.g., CA, TX, NY)' },
            { status: 400 }
          );
        }
        
        // Get current members for the state
        const stateData = await makeCongressRequest(`member?currentMember=true&state=${state.toUpperCase()}&limit=250`);
        console.log('State data response:', JSON.stringify(stateData, null, 2));
        
        if (!stateData.members || !Array.isArray(stateData.members)) {
          console.error('Invalid state data response:', stateData);
          return NextResponse.json(
            { error: 'Invalid response from Congress API' },
            { status: 500 }
          );
        }
        
        results = transformMembers(stateData.members);
        break;

      case 'district':
        if (!state || !district) {
          return NextResponse.json(
            { error: 'Both state and district parameters are required for district search' },
            { status: 400 }
          );
        }
        
        const districtNum = parseInt(district);
        if (isNaN(districtNum) || districtNum < 1 || districtNum > 99) {
          return NextResponse.json(
            { error: 'District must be a valid number between 1 and 99' },
            { status: 400 }
          );
        }
        
        // Get current member for the district
        const districtData = await makeCongressRequest(`member?currentMember=true&state=${state.toUpperCase()}&district=${districtNum}&limit=1`);
        console.log('District data response:', JSON.stringify(districtData, null, 2));
        
        if (!districtData.members || !Array.isArray(districtData.members)) {
          console.error('Invalid district data response:', districtData);
          return NextResponse.json(
            { error: 'Invalid response from Congress API' },
            { status: 500 }
          );
        }
        
        const members = transformMembers(districtData.members);
        results = members.length > 0 ? [members[0]] : [];
        break;

      case 'name':
        if (!name || name.trim().length < 2) {
          return NextResponse.json(
            { error: 'Name parameter is required and must be at least 2 characters for name search' },
            { status: 400 }
          );
        }
        
        // Get all current members and filter by name
        const allMembersData = await makeCongressRequest(`member?currentMember=true&limit=250`);
        console.log('All members data response:', JSON.stringify(allMembersData, null, 2));
        
        if (!allMembersData.members || !Array.isArray(allMembersData.members)) {
          console.error('Invalid all members data response:', allMembersData);
          return NextResponse.json(
            { error: 'Invalid response from Congress API' },
            { status: 500 }
          );
        }
        
        const allMembers = transformMembers(allMembersData.members);
        
        const searchTerms = name.toLowerCase().split(' ');
        results = allMembers.filter(member => {
          const memberText = `${member.name} ${member.firstName} ${member.lastName}`.toLowerCase();
          return searchTerms.some(term => memberText.includes(term));
        });
        break;

      case 'details':
        if (!bioguideId) {
          return NextResponse.json(
            { error: 'Bioguide ID parameter is required for details search' },
            { status: 400 }
          );
        }
        
        if (!/^[A-Z]\d{6}$/.test(bioguideId)) {
          return NextResponse.json(
            { error: 'Invalid Bioguide ID format. Should be like: A000001' },
            { status: 400 }
          );
        }
        
        const memberData = await makeCongressRequest(`member/${bioguideId}`);
        console.log('Member details response:', JSON.stringify(memberData, null, 2));
        
        if (!memberData.member) {
          console.error('Invalid member details response:', memberData);
          return NextResponse.json(
            { error: 'Invalid response from Congress API' },
            { status: 500 }
          );
        }
        
        const memberDetails = memberData.member;
        results = [transformMembers([memberDetails])[0]];
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid search type. Use: state, district, name, or details' },
          { status: 400 }
        );
    }

    // Add metadata to response
    const response = {
      success: true,
      searchType: type,
      searchParams: {
        state: state?.toUpperCase() || null,
        district: district ? parseInt(district) : null,
        name: name || null,
        bioguideId: bioguideId || null
      },
      results: {
        count: results.length,
        members: results
      },
      timestamp: new Date().toISOString()
    };

    console.log('Final response:', JSON.stringify(response, null, 2));
    return NextResponse.json(response);

  } catch (error) {
    console.error('Congress Members API error:', error);
    
    // Check if it's a Congress API configuration issue
    if (error instanceof Error && error.message.includes('API key not configured')) {
      return NextResponse.json(
        { 
          error: 'Congress API is not properly configured. Please check your API key.',
          details: 'Make sure CONGRESS_API_KEY is set in your environment variables.'
        },
        { status: 503 }
      );
    }
    
    // Check if it's a Congress API rate limit or service issue
    if (error instanceof Error && error.message.includes('Congress API error')) {
      return NextResponse.json(
        { 
          error: 'Congress API service error',
          details: 'The Congress.gov API may be temporarily unavailable. Please try again later.'
        },
        { status: 502 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error occurred while fetching member data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}