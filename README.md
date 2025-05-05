## Tech Stack

- **Frontend Framework**: Next.js 14 (React)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Environment Variables

Create a `.env` file in your project root with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://acrwslnuvtmfkqrkvtgi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# OpenAI
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key-here
```

**Never commit your actual keys to version control.**

## Database Structure

The main table is `earmarks` with these columns:

- `id`: number
- `created_at`: string (timestamp)
- `year`: number
- `agency`: string
- `subunit`: string | null
- `subcommittee`: string | null
- `account`: string | null
- `budget_number`: string | null
- `budget_function`: string | null
- `recipient`: string
- `amount`: number
- `location`: string
- `member`: string | null

## Key Features

1. **Real-time Data Loading**
   - Direct connection to Supabase database
   - Efficient data fetching and state management

2. **Advanced Search Functionality**
   - Full-text search across all columns
   - Column-specific filtering
   - Dynamic result updates

3. **Responsive Table Display**
   - Clean, readable layout
   - Sortable columns
   - Mobile-friendly design

## Security

- **Supabase RLS:**  
  Make sure your Supabase project has Row Level Security (RLS) enabled and a policy that allows read access as needed.

- **API Keys:**  
  All keys are loaded from environment variables. Never commit secrets to your repo.

## Environment Setup

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://acrwslnuvtmfkqrkvtgi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Access the application at `http://localhost:3000`

## Supabase Configuration

The application requires:
- A Supabase project
- The `earmarks` table in the public schema
- Appropriate RLS policies for public read access

## Deployment

The application can be deployed on any platform that supports Next.js, such as:
- Vercel
- Netlify
- AWS
- Digital Ocean

## Future Enhancements

Potential improvements:
- Advanced filtering options
- Data visualization features
- Export functionality
- Pagination for large datasets
- Sorting capabilities

## Usage

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up your `.env` file** (see above).

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser to:**  
   [http://localhost:3000](http://localhost:3000)

## How It Works

- **AI Search:**  
  Enter a natural language query (e.g., "Show me education projects in California over $1 million") and the app will use OpenAI to convert it into filters.

- **Advanced Filters:**  
  Use the filter section to narrow results by amount, year, or location.

- **Data Analysis:**  
  Click "Analyze Data" to get an AI-generated summary of the current dataset.

- **Table:**  
  View all earmarks, with real-time filtering and searching.

## Future Improvements

- Data visualization (charts, graphs)
- Pagination and sorting
- Export to CSV
- User authentication

## License

MIT

## Questions or suggestions?

Open an issue or PR!
