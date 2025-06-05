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
  if (!API_KEY) {
    throw new Error('Congress API key not configured');
  }

  const url = `${CONGRESS_API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}&format=json`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Congress API request failed:', error);
    throw error;
  }
}

function transformMembers(members: any[]): CongressMember[] {
  return members.map(member => ({
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
  }));
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

    // Validate required parameters based on search type
    if (!type) {
      return NextResponse.json(
        { error: 'Search type is required. Use: state, district, name, or details' },
        { status: 400 }
      );
    }

    let results;

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
        
        const stateData = await makeCongressRequest(`/member?currentMember=true&state=${state.toUpperCase()}&limit=250`);
        results = transformMembers(stateData.members || []);
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
        
        const districtData = await makeCongressRequest(`/member/congress/118/${state.toUpperCase()}/${districtNum}?currentMember=true`);
        const members = transformMembers(districtData.members || []);
        results = members.length > 0 ? [members[0]] : [];
        break;

      case 'name':
        if (!name || name.trim().length < 2) {
          return NextResponse.json(
            { error: 'Name parameter is required and must be at least 2 characters for name search' },
            { status: 400 }
          );
        }
        
        const allMembersData = await makeCongressRequest(`/member?currentMember=true&limit=250`);
        const allMembers = transformMembers(allMembersData.members || []);
        
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
        
        const memberData = await makeCongressRequest(`/member/${bioguideId}`);
        const memberDetails = memberData.member;
        if (memberDetails) {
          results = [transformMembers([memberDetails])[0]];
        } else {
          results = [];
        }
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