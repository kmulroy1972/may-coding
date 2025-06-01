# 🏛️ MOSAIC - Federal Funding Intelligence Platform

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.3.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-green?style=for-the-badge&logo=openai)](https://openai.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-orange?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![React](https://img.shields.io/badge/React-19.0+-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)

**AI-Powered Federal Earmark Analysis and Funding Intelligence**

[Features](#features) • [Installation](#installation) • [API Docs](#api-documentation) • [Contributing](#contributing)

</div>

---

## 🎯 Overview

**MOSAIC** is a sophisticated federal funding intelligence platform that leverages advanced AI to analyze Congressional earmarks and federal appropriations data. Built for researchers, policy analysts, and government professionals, MOSAIC transforms complex funding data into actionable insights through natural language queries.

### 🏛️ Mission Statement
Democratize access to federal funding information by providing an intuitive, AI-powered interface for exploring Congressional earmarks, understanding funding patterns, and identifying opportunities for community development.

---

## ✨ Features

### 🤖 **Advanced AI Chat Interface**
- **Natural Language Queries**: Ask complex questions in plain English
- **Contextual Understanding**: AI maintains conversation context for follow-up questions
- **Intent Recognition**: Automatically classifies queries (search, analyze, compare, guidance)
- **Smart Entity Extraction**: Identifies agencies, members, locations, amounts, and dates

### 📊 **Comprehensive Data Analysis**
- **50,000+ Federal Earmarks**: Complete database of Congressional appropriations
- **Multi-dimensional Filtering**: Filter by agency, year, location, member, amount
- **Trend Analysis**: Identify funding patterns across time periods
- **Comparative Analytics**: Compare agencies, states, and funding categories

### 🧠 **Intelligent Features**
- **Conversation Memory**: Learns user preferences and maintains session context
- **Funding Guidance**: Provides specific advice for securing federal funding
- **Document Search**: Semantic search across federal funding documentation
- **Query Suggestions**: Contextual recommendations based on search patterns

### 🎨 **Professional Interface**
- **Federal Design System**: Government-compliant UI with accessibility standards
- **MOSAIC Branding**: Professional federal blue and emerald color scheme
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Dark/Light Themes**: Adaptable interface for various work environments

### 🔐 **Enterprise Security**
- **API Key Management**: Secure OpenAI and Supabase integration
- **Session Isolation**: User conversations are properly isolated
- **Data Privacy**: No PII storage, temporary session management
- **Audit Trails**: Comprehensive logging for compliance requirements

---

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15.3.1** - React framework with App Router
- **React 19** - Modern React with concurrent features
- **TypeScript 5.0+** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Markdown** - Rich text rendering with GitHub Flavored Markdown

### **Backend & AI**
- **OpenAI GPT-4 Turbo** - Advanced language model for query processing
- **LangChain** - AI application framework for prompt engineering
- **OpenAI Embeddings** - Vector search for document retrieval
- **Custom Entity Extraction** - Specialized parsing for federal data

### **Database & Storage**
- **Supabase PostgreSQL** - Scalable relational database
- **OpenAI Vector Store** - Semantic document search
- **Edge Functions** - Serverless API deployment

### **Development Tools**
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting
- **TypeScript Strict Mode** - Enhanced type checking
- **PostCSS** - CSS processing and optimization

---

## 🚀 Installation

### Prerequisites

- **Node.js 18.17+** 
- **npm 9+** or **yarn 1.22+**
- **Git** for version control
- **OpenAI API Key** with GPT-4 access
- **Supabase Project** with database access

### 1. Clone Repository

```bash
git clone https://github.com/your-org/mosaic-funding-intelligence.git
cd mosaic-funding-intelligence
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

Create `.env.local` file in the project root:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Vector Store Configuration (Optional)
OPENAI_VECTOR_STORE_ID=your-vector-store-id
```

### 4. Database Setup

```bash
# Initialize Supabase tables
npm run db:setup

# Upload sample earmark data (optional)
npm run db:seed
```

### 5. Vector Store Setup (Optional)

```bash
# Create OpenAI vector store for document search
node scripts/setup-vector-store.js

# Upload federal funding documents
node scripts/upload-documents.js
```

### 6. Start Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
mosaic-funding-intelligence/
├── docs/                          # Documentation files
│   └── earmark-data-dictionary.md # Database schema documentation
├── public/                        # Static assets
│   └── mosaic-logo.svg           # MOSAIC branding
├── scripts/                      # Utility scripts
│   ├── setup-vector-store.js     # Vector store initialization
│   └── upload-documents.js       # Document upload automation
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── admin/               # Admin interface
│   │   │   ├── page.tsx         # Document management
│   │   │   └── admin.css        # Admin-specific styles
│   │   ├── api/                 # API routes
│   │   │   ├── askai/           # Main AI chat endpoint
│   │   │   ├── search/          # Direct database search
│   │   │   ├── admin/           # Document management APIs
│   │   │   └── clearConversation/ # Session management
│   │   ├── globals.css          # Professional federal design system
│   │   ├── layout.tsx           # Root layout with branding
│   │   └── page.tsx             # Main chat interface
│   ├── components/              # Reusable UI components
│   │   ├── SearchBar.tsx        # Search interface
│   │   ├── Filters.tsx          # Query filters
│   │   └── EarmarkChart.tsx     # Data visualization
│   └── lib/                     # Utility libraries
│       ├── supabase.ts          # Database client
│       ├── conversationMemory.ts # AI conversation management
│       ├── sendMessageToAI.ts   # API communication
│       └── sampleQueries.ts     # Query templates
├── types/                       # TypeScript definitions
│   └── database.types.ts        # Database schema types
├── supabase/                    # Supabase configuration
├── vector-store-config.json     # Vector store settings
└── package.json                 # Dependencies and scripts
```

---

## 📊 Database Schema

### Earmarks Table Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key identifier |
| `year` | INTEGER | Fiscal year (2022, 2023, 2024) |
| `recipient` | TEXT | Organization receiving funding |
| `amount` | BIGINT | Funding amount in dollars |
| `location` | TEXT | State/location code (e.g., 'CA', 'TX') |
| `member` | TEXT | Congressional member who secured funding |
| `agency` | TEXT | Federal agency providing funding |
| `subcommittee` | TEXT | Congressional subcommittee |
| `account` | TEXT | Federal account/program |
| `budget_function` | TEXT | Budget categorization |
| `created_at` | TIMESTAMP | Record creation timestamp |

### Sample Data Structure

```sql
-- Example earmark record
INSERT INTO earmarks (
  year, recipient, amount, location, member, agency, 
  subcommittee, account, budget_function
) VALUES (
  2024,
  'University Medical Center Equipment Upgrade',
  2500000,
  'CA',
  'Senator Dianne Feinstein CA',
  'Department of Health and Human Services',
  'Labor, Health and Human Services, Education',
  'Health Resources and Services Administration',
  'Health'
);
```

---

## 🔌 API Documentation

### Main AI Chat Endpoint

**POST** `/api/askai`

Processes natural language queries about federal funding data.

#### Request Body
```typescript
{
  question: string;           // User's natural language query
  sessionId?: string;         // Optional session identifier
  messages?: Array<{          // Optional conversation history
    text: string;
    sender: 'user' | 'ai';
  }>;
}
```

#### Response Format
```typescript
{
  answer: string;             // AI-generated response
  data: Earmark[];           // Matching earmark records
  count: number;             // Total results found
  sessionId: string;         // Session identifier
  queryInfo: {
    intent: string;          // Query classification
    confidence: number;      // Extraction confidence
    equipmentType?: string;  // Detected equipment type
  };
  suggestions?: string[];    // Follow-up query suggestions
  contextualInfo: {
    sessionFocus: object;    // Current session context
    sessionGoals: string[];  // Identified user goals
    expertiseLevel: string;  // User experience level
  };
}
```

#### Example Usage

```bash
curl -X POST http://localhost:3000/api/askai \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Show me Department of Labor earmarks over $1 million in 2024",
    "sessionId": "user-session-123"
  }'
```

### Direct Search Endpoint

**POST** `/api/search`

Performs direct database queries with structured filters.

#### Request Body
```typescript
{
  filters: {
    agency?: string;
    year?: number;
    location?: string;
    member?: string;
    minAmount?: number;
    maxAmount?: number;
    keywords?: string[];
  };
  limit?: number;            // Results limit (default: 50)
  offset?: number;           // Pagination offset
}
```

### Admin Management APIs

#### Document Upload
**POST** `/api/admin/upload-document`

#### Vector Store Statistics
**GET** `/api/admin/vector-store-stats`

#### Document Management
**GET** `/api/admin/documents`
**DELETE** `/api/admin/documents/[id]`

---

## 💬 Usage Examples

### Basic Queries

```javascript
// Agency-specific search
"Show me all Department of Transportation earmarks"

// Year-based analysis
"What earmarks were approved in fiscal year 2024?"

// Location filtering
"Show me earmarks for California projects"

// Amount-based queries
"List all earmarks over $5 million"
```

### Advanced Analytics

```javascript
// Comparative analysis
"Compare Transportation and Education department funding"

// Trend analysis
"Show funding trends for healthcare projects from 2022 to 2024"

// Member-specific research
"What earmarks did Senator Warren secure for Massachusetts?"

// Multi-criteria filtering
"Show me Labor Department earmarks over $1M in New England states"
```

### Funding Guidance Queries

```javascript
// Equipment funding advice
"Which account would be best to request funding for an MRI machine?"

// Process guidance
"How do I apply for federal funding for community health center equipment?"

// Strategic recommendations
"What's the typical timeline for earmark approval processes?"
```

---

## 🧠 AI Architecture

### Query Processing Flow

1. **Entity Extraction**: Identifies agencies, years, amounts, locations, members
2. **Intent Classification**: Categorizes as search, analyze, compare, or guidance
3. **Context Integration**: Incorporates conversation history and user preferences
4. **Database Querying**: Constructs optimized SQL queries based on extracted entities
5. **Document Retrieval**: Performs semantic search across federal documentation
6. **Response Generation**: Uses GPT-4 to create comprehensive, contextual responses
7. **Learning Integration**: Updates user preferences and conversation memory

### Conversation Memory System

- **Session Management**: 24-hour session persistence with automatic cleanup
- **User Preferences**: Learns query patterns, expertise level, and response preferences
- **Context Building**: Maintains focus on agencies, equipment types, and ongoing research
- **Query Optimization**: Uses successful patterns to improve future searches

---

## 🔐 Security & Compliance

### Data Privacy
- **No PII Storage**: User conversations are temporary and session-based
- **Secure API Keys**: Environment-based configuration with no hardcoded secrets
- **Data Encryption**: All database connections use SSL/TLS encryption
- **Session Isolation**: User sessions are properly isolated and secured

### Government Compliance
- **508 Accessibility**: Interface follows federal accessibility guidelines
- **Security Standards**: Implements government-recommended security practices
- **Audit Logging**: Comprehensive request and response logging
- **HTTPS Enforcement**: All production traffic encrypted in transit

### Production Security Checklist

- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure CORS policies for production domains
- [ ] Implement rate limiting on API endpoints
- [ ] Set up monitoring and alerting systems
- [ ] Regular security dependency updates
- [ ] Database backup and recovery procedures

---

## 🚀 Deployment

### Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Configure environment variables in Vercel dashboard
vercel env add OPENAI_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run Docker container
docker build -t mosaic-funding .
docker run -p 3000:3000 --env-file .env.local mosaic-funding
```

### Traditional Server Deployment

```bash
# Build for production
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start npm --name "mosaic" -- start
```

---

## 🔧 Development

### Development Commands

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

### Database Management

```bash
# Reset database
npm run db:reset

# Apply migrations
npm run db:migrate

# Seed sample data
npm run db:seed
```

### Vector Store Management

```bash
# Setup vector store
node scripts/setup-vector-store.js

# Upload documents
node scripts/upload-documents.js

# Check vector store status
node scripts/check-vector-store.js
```

### Code Quality Standards

- **TypeScript Strict Mode**: Enforced type checking
- **ESLint Configuration**: Government coding standards
- **Prettier Formatting**: Consistent code style
- **Component Testing**: Jest and React Testing Library
- **API Testing**: Automated endpoint validation

---

## 📈 Performance Optimization

### Frontend Performance
- **Code Splitting**: Automatic route-based splitting with Next.js
- **Image Optimization**: Next.js automatic image optimization
- **Caching Strategy**: Static and dynamic content caching
- **Bundle Analysis**: Regular bundle size monitoring

### Backend Performance
- **Database Indexing**: Optimized indexes on frequently queried fields
- **Connection Pooling**: Supabase automatic connection management
- **API Response Caching**: Strategic caching of expensive operations
- **Query Optimization**: Efficient SQL query patterns

### Monitoring & Analytics
- **Performance Metrics**: Response time and throughput monitoring
- **Error Tracking**: Comprehensive error logging and alerting
- **Usage Analytics**: Query pattern analysis and optimization
- **Uptime Monitoring**: 24/7 service availability tracking

---

## 🔍 Maintenance & Monitoring

### Regular Maintenance Tasks

```bash
# Update dependencies monthly
npm audit
npm update

# Database maintenance
npm run db:vacuum
npm run db:analyze

# Vector store optimization
node scripts/optimize-vector-store.js

# Log rotation and cleanup
npm run logs:cleanup
```

### Monitoring Checklist

- [ ] API response times under 2 seconds
- [ ] Database connection pool utilization
- [ ] OpenAI API usage and costs
- [ ] Supabase database performance metrics
- [ ] Error rates and user feedback trends
- [ ] Security audit logs review

---

## 🤝 Contributing

We welcome contributions from the developer community! Please follow these guidelines:

### Development Workflow

1. **Fork the repository** and create a feature branch
2. **Follow coding standards** established in the project
3. **Write comprehensive tests** for new functionality
4. **Update documentation** for any API or feature changes
5. **Submit a pull request** with detailed description

### Contribution Guidelines

```bash
# Setup development environment
git clone https://github.com/your-username/mosaic-funding-intelligence.git
cd mosaic-funding-intelligence
npm install
cp .env.local.example .env.local
# Configure your environment variables
npm run dev
```

### Code Review Process

- **Automated Testing**: All PRs must pass CI/CD pipeline
- **Code Quality**: ESLint and TypeScript checks must pass
- **Security Review**: Security implications are assessed
- **Documentation**: Updates must include relevant documentation
- **Performance**: No significant performance regressions

### Feature Request Process

1. **Check existing issues** for similar requests
2. **Create detailed issue** with use case and requirements
3. **Engage with maintainers** for technical discussion
4. **Prototype implementation** if approved
5. **Submit pull request** following contribution guidelines

---

## 📞 Support & Resources

### Documentation
- **API Reference**: [/docs/api](./docs/api.md)
- **Database Schema**: [/docs/schema](./docs/earmark-data-dictionary.md)
- **Deployment Guide**: [/docs/deployment](./docs/deployment.md)

### Community Support
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Technical questions and community support
- **Developer Slack**: Real-time development discussions

### Professional Support
- **Enterprise Support**: Available for government agencies
- **Training Services**: Custom training for development teams
- **Consulting Services**: Implementation and customization support

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

### Open Source Notice
MOSAIC is built on open source technologies and contributions are welcomed from the developer community. The project maintains compatibility with government open source initiatives and federal source code policies.

---

## 🏛️ Government Partnership

**MOSAIC** is designed to support transparency and accessibility in federal funding analysis. We work closely with:

- **Congressional Research Service** for data accuracy
- **Government Accountability Office** for compliance standards  
- **Federal agencies** for funding process guidance
- **Academic institutions** for research collaboration

---

<div align="center">

**Built with ❤️ for government transparency and civic engagement**

[⬆ Back to Top](#-mosaic---federal-funding-intelligence-platform)

</div>