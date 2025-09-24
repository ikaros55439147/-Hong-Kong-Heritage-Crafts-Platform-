# 香港弱勢行業傳承平台 (Hong Kong Heritage Crafts Platform)

A digital platform dedicated to preserving and promoting Hong Kong's traditional crafts and endangered trades.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Git

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd hk-heritage-crafts-platform
```

2. Install dependencies
```bash
npm install
```

3. Copy environment variables
```bash
cp .env.example .env.local
```

4. Start the development environment
```bash
# Start Docker services (PostgreSQL, Redis)
docker-compose up -d

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start the development server
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

### Database Management

- **Adminer**: http://localhost:8080 (Database GUI)
- **Prisma Studio**: `npm run db:studio`

### Project Structure

```
src/
├── app/                 # Next.js App Router
├── components/          # Reusable UI components
├── lib/                # Utility libraries (Prisma, Redis)
├── types/              # TypeScript type definitions
└── utils/              # Helper functions

prisma/
├── schema.prisma       # Database schema
└── migrations/         # Database migrations
```

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js

## 📝 Features

- 🎨 Traditional craftsman profiles
- 📚 Course booking and management
- 🛒 E-commerce for handmade products
- 🌐 Multi-language support (Traditional Chinese, Simplified Chinese, English)
- 📱 Mobile-responsive design
- 👥 Community interaction features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.