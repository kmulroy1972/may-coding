import React from "react";
import { Earmark } from "@/types/database.types";

function convertToCSV(data: Earmark[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(row =>
    Object.values(row).map(v => `"${String(v ?? "")}"`).join(",")
  );
  return [headers, ...rows].join("\n");
}

type Props = {
  results: Earmark[];
};

export default function ResultsList({ results }: Props) {
  const downloadCsv = () => {
    const csv = convertToCSV(results);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "earmarks.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!results.length) return <div>No results</div>;
  return (
    <div>
      <button onClick={downloadCsv} style={{ marginBottom: 8 }}>Export CSV</button>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
        <thead>
          <tr style={{ background: "#f4f6fa" }}>
            <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}>Year</th>
            <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}>Member</th>
            <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}>Recipient</th>
            <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}>Amount ($)</th>
            <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}>Location</th>
          </tr>
        </thead>
        <tbody>
          {results.map((x, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
              <td style={{ padding: 8 }}>{x.year}</td>
              <td style={{ padding: 8 }}>{x.member}</td>
              <td style={{ padding: 8 }}>{x.recipient}</td>
              <td style={{ padding: 8 }}>{x.amount.toLocaleString()}</td>
              <td style={{ padding: 8 }}>{x.location ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
