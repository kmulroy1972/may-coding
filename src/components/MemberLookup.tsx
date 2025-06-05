'use client';

import React, { useState } from 'react';
import { congressApi, CongressMember } from '../lib/congressApi';

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'CA', name: 'California' },
  // ... add all states
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
      let results: CongressMember[] = [];

      switch (searchType) {
        case 'state':
          if (!selectedState) {
            setError('Please select a state');
            return;
          }
          results = await congressApi.getMembersByState(selectedState);
          break;

        case 'district':
          if (!selectedState || !district) {
            setError('Please select state and district');
            return;
          }
          const member = await congressApi.getMemberByDistrict(selectedState, parseInt(district));
          results = member ? [member] : [];
          break;

        case 'name':
          if (!nameQuery.trim()) {
            setError('Please enter a name to search');
            return;
          }
          results = await congressApi.searchMembersByName(nameQuery.trim());
          break;
      }

      setMembers(results);
      if (results.length === 0) {
        setError('No members found');
      }
    } catch (err) {
      setError('Failed to fetch member data. Please try again.');
      console.error('Member lookup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Find Your Representatives
      </h2>

      {/* Search Type Selector */}
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setSearchType('state')}
            className={`px-4 py-2 rounded-md font-medium ${
              searchType === 'state'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            By State
          </button>
          <button
            onClick={() => setSearchType('district')}
            className={`px-4 py-2 rounded-md font-medium ${
              searchType === 'district'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            By District
          </button>
          <button
            onClick={() => setSearchType('name')}
            className={`px-4 py-2 rounded-md font-medium ${
              searchType === 'name'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            By Name
          </button>
        </div>

        {/* Search Form */}
        <div className="flex space-x-4 items-end">
          {searchType === 'state' && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select State
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a state...</option>
                {US_STATES.map(state => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {searchType === 'district' && (
            <>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select State
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a state...</option>
                  {US_STATES.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  District Number
                </label>
                <input
                  type="number"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g., 12"
                  min="1"
                  max="99"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {searchType === 'name' && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Member Name
              </label>
              <input
                type="text"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Enter first or last name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Results */}
      {members.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Results ({members.length} found)
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <MemberCard key={member.bioguideId} member={member} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ member }: { member: CongressMember }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex items-start space-x-4">
        <img
          src={member.imageUrl}
          alt={member.name}
          className="w-16 h-20 rounded-md object-cover bg-gray-200"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-avatar.png';
          }}
        />
        
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {member.name}
          </h4>
          
          <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <p>
              <span className="font-medium">Party:</span> {member.party}
            </p>
            <p>
              <span className="font-medium">Chamber:</span> {member.chamber}
            </p>
            <p>
              <span className="font-medium">State:</span> {member.state}
              {member.district && ` - District ${member.district}`}
            </p>
            
            {member.phone && (
              <p>
                <span className="font-medium">Phone:</span> {member.phone}
              </p>
            )}
          </div>

          {member.officialUrl && (
            <a
              href={member.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Official Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}