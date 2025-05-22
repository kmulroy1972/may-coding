# Mosaic - AI-Powered Earmark Analysis Platform

Mosaic is a modern web application that leverages AI to analyze and query federal earmark data. Built with Next.js, TypeScript, and Supabase, it provides an intuitive interface for exploring earmark allocations across different agencies and years.

## 🌟 Features

- **AI-Powered Query Interface**: Natural language processing of earmark-related questions
- **Real-time Data Analysis**: Instant responses to complex queries about federal earmarks
- **Modern UI/UX**: Clean, responsive design with dark/light mode support
- **Interactive Chat**: Typewriter-style responses with markdown support
- **Data Visualization**: Formatted display of earmark data

## 📁 Project Structure

```
may-coding/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── askai/
│   │   │   │   └── route.ts          # AI query endpoint
│   │   │   ├── clearConversation/    # Clear chat history endpoint
│   │   │   └── search/               # Search functionality endpoint
│   │   ├── chat/                     # Chat-related components
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx               # Root layout component
│   │   ├── page.tsx                 # Main application page
│   │   └── favicon.ico              # Site favicon
│   ├── components/
│   │   ├── EarmarkChart.tsx         # Chart visualization component
│   │   ├── SearchBar.tsx            # Search input component
│   │   └── Filters.tsx              # Data filtering component
│   └── lib/
│       ├── conversatiinMemory.ts     # Chat history management
│       ├── sampleQueries.ts          # Example query templates
│       ├── sendMessageToAI.ts        # AI message handling
│       ├── supabase.ts              # Database client
│       └── useDebounce.ts           # Debounce hook for search
├── public/                          # Static assets
├── types/                           # TypeScript type definitions
├── supabase/                        # Database migrations and types
├── .next/                           # Next.js build output
├── node_modules/                    # Project dependencies
├── .git/                            # Git repository
├── .eslintrc.json                   # ESLint configuration
├── .eslintignore                    # ESLint ignore rules
├── .gitignore                       # Git ignore rules
├── next.config.ts                   # Next.js configuration
├── next-env.d.ts                    # Next.js TypeScript declarations
├── package.json                     # Project dependencies and scripts
├── package-lock.json                # Dependency lock file
├── postcss.config.js                # PostCSS configuration
├── tailwind.config.js               # Tailwind CSS configuration
└── tsconfig.json                    # TypeScript configuration
```

## 🔄 Recent Changes

### Removed Files
- `eslint.config.mjs` - Replaced with `.eslintrc.json`
- `pages/api/ask.ts` - Migrated to `app/api/askai/route.ts`
- `src/lib/api_request.ts` - Functionality merged into `sendMessageToAI.ts`

### Architecture Updates
- Migrated from Pages Router to App Router
- Consolidated API endpoints under `app/api/`
- Enhanced chat functionality with dedicated components
- Improved error handling and response formatting

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kmulroy1972/may-coding.git
   cd may-coding
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🤖 AI Integration

### Architecture

The AI integration consists of three main components:

1. **Frontend Interface** (`src/app/page.tsx`)
   - Manages chat state and user interactions
   - Handles message formatting and display
   - Implements typewriter effect for AI responses

2. **API Endpoint** (`src/app/api/askai/route.ts`)
   - Processes incoming queries
   - Implements natural language understanding
   - Queries Supabase database based on query intent
   - Formats and returns responses

3. **Message Handler** (`src/lib/sendMessageToAI.ts`)
   - Manages communication between frontend and API
   - Handles error states and loading indicators

### Query Processing Flow

1. User submits a question through the chat interface
2. Frontend sends the query to the `/api/askai` endpoint
3. API processes the query:
   - Extracts key entities (agencies, years, amounts)
   - Constructs appropriate database queries
   - Formats results for display
4. Response is sent back to frontend and displayed in chat

### Example Queries

- "Show me all earmarks for the Department of Labor in 2022"
- "What are the largest earmarks above $1 million?"
- "List all earmarks for education programs"

## 🛠️ Technologies

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI/ML**: Custom natural language processing
- **Deployment**: Vercel (recommended)

## 🔧 Configuration

### Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Database Setup

1. Create a new Supabase project
2. Run the migrations in the `supabase/migrations` directory
3. Import your earmark data into the database

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for the powerful database platform
- All contributors who have helped shape this project
