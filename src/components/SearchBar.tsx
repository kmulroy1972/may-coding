import React from "react";

type Props = {
  query: string;
  setQuery: (q: string) => void;
  onSearch: () => void;
  aiQuestion: string;
  setAiQuestion: (q: string) => void;
  onAskAi: () => void;
  aiLoading: boolean;
};

export default function SearchBar({
  query, setQuery, onSearch,
  aiQuestion, setAiQuestion, onAskAi, aiLoading,
}: Props) {
  return (
    <div>
      <label>Ask a question</label>
      <input
        value={aiQuestion}
        onChange={e => setAiQuestion(e.target.value)}
        placeholder="Which projects did Sen. Menendez secure in LHHS FY 2023?"
        style={{ width: "100%", marginBottom: 8 }}
      />
      <button onClick={onAskAi} disabled={aiLoading} style={{ marginRight: 16 }}>
        {aiLoading ? "Asking..." : "Ask AI"}
      </button>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search earmarks..."
        style={{ width: "50%", marginRight: 8 }}
      />
      <button onClick={onSearch}>Search</button>
    </div>
  );
}
