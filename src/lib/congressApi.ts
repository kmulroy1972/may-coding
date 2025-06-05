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
    }>;
  };
  pagination: {
    count: number;
    next?: string;
    prev?: string;
  };
}

class CongressApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = CONGRESS_API_BASE || 'https://api.congress.gov/v3';
    this.apiKey = API_KEY || '';
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `${this.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${this.apiKey}&format=json`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get current members by state
  async getMembersByState(state: string): Promise<CongressMember[]> {
    const data = await this.makeRequest(`/member?currentMember=true&state=${state}&limit=250`);
    return this.transformMembers(data.members || []);
  }

  // Get member by state and district
  async getMemberByDistrict(state: string, district: number): Promise<CongressMember | null> {
    try {
      const data = await this.makeRequest(`/member/congress/118/${state}/${district}?currentMember=true`);
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
    
    return allMembers.filter(member => 
      member.name.toLowerCase().includes(query.toLowerCase()) ||
      member.lastName.toLowerCase().includes(query.toLowerCase())
    );
  }

  private transformMembers(members: any[]): CongressMember[] {
    return members.map(member => ({
      bioguideId: member.bioguideId,
      name: member.name || `${member.firstName} ${member.lastName}`,
      firstName: member.firstName,
      lastName: member.lastName,
      party: member.party || member.partyName,
      state: member.state,
      district: member.district,
      chamber: member.terms?.[0]?.chamber || 'House of Representatives',
      officialUrl: member.officialWebsiteUrl,
      imageUrl: `https://bioguide.congress.gov/bioguide/photo/${member.bioguideId}.jpg`
    }));
  }
}

export const congressApi = new CongressApiClient();