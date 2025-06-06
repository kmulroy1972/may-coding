const CONGRESS_API_BASE = process.env.NEXT_PUBLIC_CONGRESS_API_BASE_URL;
const API_KEY = process.env.CONGRESS_API_KEY;

export interface CongressMember {
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

export interface CongressApiResponse {
  members: {
    member: Array<{
      bioguideId: string;
      name: string;
      state: string;
      district?: number;
      party: string;
      url: string;
      terms?: Array<{
        congress: string;
        startDate: string;
        endDate: string | null;
        chamber: string;
      }>;
    }>;
  };
  pagination: {
    count: number;
    next?: string;
    prev?: string;
  };
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

class CongressApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = CONGRESS_API_BASE || 'https://api.congress.gov/v3';
    this.apiKey = API_KEY || '';
  }

  private async makeRequest(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Congress API key not configured');
    }

    const url = `${this.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${this.apiKey}&format=json`;
    console.log('Making Congress API request to:', url);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Congress API response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('Congress API request failed:', error);
      throw error;
    }
  }

  // Get current members by state
  async getMembersByState(state: string): Promise<CongressMember[]> {
    try {
      let allMembers: any[] = [];
      let nextUrl = `/member?currentMember=true&state=${state.toUpperCase()}&chamber=senate&limit=100`;
      
      // Fetch all pages of results
      while (nextUrl) {
        const data = await this.makeRequest(nextUrl);
        
        if (!data?.members?.member) {
          console.error('No members found in API response');
          break;
        }

        allMembers = allMembers.concat(data.members.member);
        
        // Get next page URL from pagination
        nextUrl = data.pagination?.next ? 
          data.pagination.next.replace(/^https:\/\/api\.congress\.gov\/v3/, '') : 
          null;
      }

      // Filter for current senators from the specified state
      const senators = allMembers.filter(member => {
        const terms = member.terms?.item || [];
        const isCurrentSenator = terms.some((term: any) => 
          term.chamber === 'Senate' && 
          (!term.endYear || term.endYear >= new Date().getFullYear())
        );
        
        console.log(`Checking member ${member.bioguideId}:`, {
          name: member.name,
          state: member.state,
          terms: terms,
          isCurrentSenator
        });
        
        return isCurrentSenator && member.state === state;
      });

      return senators.map(member => ({
        bioguideId: member.bioguideId,
        name: member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        party: getPartyName(member.party || member.partyName),
        state: member.state,
        chamber: 'Senate' as const,
        officialUrl: member.url,
        imageUrl: member.depiction?.imageUrl || `https://bioguide.congress.gov/bioguide/photo/${member.bioguideId}.jpg`
      }));
    } catch (error) {
      console.error('Error fetching members by state:', error);
      return [];
    }
  }

  // Get member by state and district
  async getMemberByDistrict(state: string, district: number): Promise<CongressMember | null> {
    try {
      const data = await this.makeRequest(`/member?currentMember=true&state=${state.toUpperCase()}&district=${district}&limit=1`);
      const members = this.transformMembers(data.members || []);
      return members[0] || null;
    } catch (error) {
      console.error('Error fetching member by district:', error);
      return null;
    }
  }

  // Get detailed member information
  async getMemberDetails(bioguideId: string): Promise<CongressMember | null> {
    try {
      const data = await this.makeRequest(`/member/${bioguideId}`);
      const member = data.member;
      
      if (!member) {
        return null;
      }

      // Check if member is current
      const isCurrentMember = member.terms?.some((term: any) => 
        term.congress === '118' && term.endDate === null
      );

      if (!isCurrentMember) {
        return null;
      }
      
      return {
        bioguideId: member.bioguideId,
        name: member.directOrderName || `${member.firstName} ${member.lastName}`,
        firstName: member.firstName,
        lastName: member.lastName,
        party: member.partyName,
        state: member.state,
        district: member.district,
        chamber: member.terms?.[0]?.chamber || 'House of Representatives',
        officialUrl: member.officialWebsiteUrl,
        phone: member.phone,
        officeAddress: member.address?.officeAddress,
        imageUrl: `https://bioguide.congress.gov/bioguide/photo/${bioguideId}.jpg`
      };
    } catch (error) {
      console.error('Error fetching member details:', error);
      return null;
    }
  }

  // Search members by name
  async searchMembersByName(query: string): Promise<CongressMember[]> {
    const data = await this.makeRequest(`/member?currentMember=true&limit=250`);
    const allMembers = this.transformMembers(data.members || []);
    
    const searchTerms = query.toLowerCase().split(' ');
    return allMembers.filter(member => {
      const memberText = `${member.name} ${member.firstName} ${member.lastName}`.toLowerCase();
      return searchTerms.some(term => memberText.includes(term));
    });
  }

  private transformMembers(members: any[]): CongressMember[] {
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

        // Handle terms data structure - terms are nested under terms.item
        const terms = member.terms?.item || [];
        console.log(`Processing member ${member.bioguideId}:`, {
          name: member.name,
          terms: terms,
          state: member.state
        });

        // Check if member is a senator
        const isSenator = terms.some((term: any) => 
          term.chamber === 'Senate' || term.chamber?.toLowerCase().includes('senate')
        );

        if (!isSenator) {
          console.log(`Filtered out non-senator: ${member.bioguideId}`);
        }

        return isSenator;
      })
      .map(member => {
        const terms = member.terms?.item || [];
        const transformed = {
          bioguideId: member.bioguideId,
          name: member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          firstName: member.firstName || '',
          lastName: member.lastName || '',
          party: getPartyName(member.party || member.partyName),
          state: member.state,
          chamber: 'Senate' as const,
          officialUrl: member.url,
          imageUrl: member.depiction?.imageUrl || `https://bioguide.congress.gov/bioguide/photo/${member.bioguideId}.jpg`
        };
        console.log('Transformed senator:', transformed);
        return transformed;
      });
  }
}

export const congressApi = new CongressApiClient();