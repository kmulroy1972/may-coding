'use client';

import React, { useState } from 'react';

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

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

export default function MemberLookup() {
  const [searchType, setSearchType] = useState<'state' | 'district' | 'name'>('state');
  const [selectedState, setSelectedState] = useState('');
  const [district, setDistrict] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [members, setMembers] = useState<CongressMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setMembers([]);

    try {
      const params = new URLSearchParams();

      switch (searchType) {
        case 'state':
          if (!selectedState) {
            setError('Please select a state');
            return;
          }
          params.set('type', 'state');
          params.set('state', selectedState);
          break;

        case 'district':
          if (!selectedState || !district) {
            setError('Please select state and district');
            return;
          }
          params.set('type', 'district');
          params.set('state', selectedState);
          params.set('district', district);
          break;

        case 'name':
          if (!nameQuery.trim()) {
            setError('Please enter a name to search');
            return;
          }
          params.set('type', 'name');
          params.set('name', nameQuery.trim());
          break;
      }

      const url = `/api/congress-members?${params.toString()}`;
      console.log('Calling API:', url);
      
      const response = await fetch(url);
      const data = await response.json();

      console.log('API Response:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${data.details || 'Failed to fetch member data'}`);
      }

      setMembers(data.results.members);
      if (data.results.members.length === 0) {
        setError('No members found matching your criteria');
      }
    } catch (err) {
      console.error('Member lookup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch member data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Search Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Search Method
          </h3>
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setSearchType('state')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                searchType === 'state'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              By State
            </button>
            <button
              onClick={() => setSearchType('district')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                searchType === 'district'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              By District
            </button>
            <button
              onClick={() => setSearchType('name')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                searchType === 'name'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              By Name
            </button>
          </div>

          {/* Search Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {searchType === 'state' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select State
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  size={1}
                >
                  <option value="">Choose a state...</option>
                  {US_STATES.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.name} ({state.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {searchType === 'district' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select State
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Choose a state...</option>
                    {US_STATES.map(state => (
                      <option key={state.code} value={state.code}>
                        {state.name} ({state.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    District Number
                  </label>
                  <input
                    type="number"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., 12"
                    min="1"
                    max="99"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            {searchType === 'name' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Member Name
                </label>
                <input
                  type="text"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter first or last name..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Debug Info (temporary) */}
      {loading && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-blue-700 dark:text-blue-300">Searching for members...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
          <div className="flex">
            <div className="text-red-400 mr-3">⚠️</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Results */}
      {members.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Results ({members.length} found)
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Current {members.length === 1 ? 'representative' : 'representatives'}
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <MemberCard key={member.bioguideId} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      {members.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏛️</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Find Your Representatives
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Search for your U.S. House Representatives and Senators by state, congressional district, or name. 
            Get contact information and connect federal funding opportunities with your elected officials.
          </p>
        </div>
      )}
    </div>
  );
}

function MemberCard({ member }: { member: CongressMember }) {
  const [imageError, setImageError] = useState(false);
  
  const getPartyColor = (party: string) => {
    switch (party) {
      case 'Democratic': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'Republican': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'Independent': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {!imageError ? (
            <img
              src={member.imageUrl}
              alt={member.name}
              className="w-16 h-20 rounded-lg object-cover bg-gray-200 dark:bg-gray-700"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-16 h-20 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight">
            {member.name}
          </h4>
          
          <div className="mt-2 space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPartyColor(member.party)}`}>
                {member.party}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {member.chamber === 'Senate' ? 'Senator' : 'Representative'}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <div className="flex items-center">
                <span className="font-medium">State:</span>
                <span className="ml-1">{member.state}</span>
                {member.district && (
                  <span className="ml-1">- District {member.district}</span>
                )}
              </div>
              
              {member.phone && (
                <div className="flex items-center">
                  <span className="font-medium">Phone:</span>
                  <a 
                    href={`tel:${member.phone}`}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {member.phone}
                  </a>
                </div>
              )}
              
              {member.officeAddress && (
                <div className="flex items-start">
                  <span className="font-medium">Office:</span>
                  <span className="ml-1 text-xs">{member.officeAddress}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {member.officialUrl && (
              <a
                href={member.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                <span>Official Website</span>
                <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            
            <button
              onClick={() => {
                console.log('View earmarks for:', member.name);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              View Earmarks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}