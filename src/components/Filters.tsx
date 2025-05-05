import React from "react";

type Props = {
  year: string;
  setYear: (y: string) => void;
  member: string;
  setMember: (m: string) => void;
  onClear: () => void;
};

export default function Filters({ year, setYear, member, setMember, onClear }: Props) {
  return (
    <div style={{marginTop: 8, marginBottom: 12}}>
      <input
        value={year}
        onChange={e => setYear(e.target.value)}
        placeholder="Year"
        style={{marginRight: 8}}
      />
      <input
        value={member}
        onChange={e => setMember(e.target.value)}
        placeholder="Member"
        style={{marginRight: 8}}
      />
      <button onClick={onClear}>Clear</button>
    </div>
  );
}
