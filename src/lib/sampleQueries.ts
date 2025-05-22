export const sampleQueries = [
  "Show me earmarks from the Department of Education in 2022",
  "What are the largest earmarks over $1 million?",
  "Which agencies received the most funding in 2023?",
  "Show me earmarks for healthcare projects",
  "Who requested the most earmarks in California?",
  "Compare funding between Department of Labor and Department of Transportation",
  "Find earmarks related to climate change initiatives",
  "What was the total amount allocated to rural development?",
  "Show me the smallest earmarks under $100,000",
  "Which representatives secured the most funding for their districts?"
];

export function getRandomSampleQueries(count: number = 5): string[] {
  const shuffled = [...sampleQueries].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}