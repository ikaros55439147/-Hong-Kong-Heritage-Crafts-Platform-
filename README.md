# 香港弱勢行業傳承平台 (Hong Kong Heritage Crafts Platform)

🏮 A comprehensive digital platform dedicated to preserving and promoting Hong Kong's traditional crafts and endangered trades.

## 🌟 Project Overview

This platform serves as a bridge between traditional craftsmen and the modern world, providing:
- **Cultural Preservation**: Digital documentation of traditional Hong Kong crafts
- **Knowledge Transfer**: Learning opportunities for new generations
- **Economic Support**: E-commerce platform for craftsmen to sell their products
- **Community Building**: Social features to connect craft enthusiasts

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Git

### Installation

1. Clone the repository
```bash
git clone https://github.com/ikaros55439147/-Hong-Kong-Heritage-Crafts-Platform-.git
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
- `npm run test` - Run tests
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

docs/                   # Project documentation
.kiro/specs/           # Feature specifications
```

## 🏗️ Architecture

- **Frontend**: Next.js 15 with React 18 and TypeScript
- **Backend**: Node.js with Express API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for session and data caching
- **Search**: Elasticsearch for content discovery
- **Storage**: AWS S3 for media files
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js with JWT
- **Testing**: Vitest with comprehensive test coverage
- **Deployment**: Docker with CI/CD pipelines

## 📝 Features

### Core Functionality
- 🎨 **Craftsman Profiles**: Detailed profiles with portfolios and specialties
- 📚 **Course Management**: Booking system for traditional craft learning
- 🛒 **E-commerce**: Marketplace for authentic handmade products
- 🌐 **Multi-language**: Support for Traditional Chinese, Simplified Chinese, and English
- 📱 **Mobile-First**: Responsive PWA design for all devices
- 👥 **Social Features**: Community interaction, following, and commenting

### Advanced Features
- 🔍 **Smart Search**: AI-powered content discovery
- 📊 **Analytics**: Comprehensive dashboard for insights
- 🔐 **Security**: Advanced security measures and compliance
- ⚡ **Performance**: Optimized for speed and scalability
- 🌍 **Internationalization**: Complete i18n implementation
- 📈 **Monitoring**: Real-time system monitoring and alerts

## 📊 Project Statistics

- **50,000+** lines of TypeScript code
- **73** comprehensive test files
- **100+** API endpoints
- **30+** database models
- **50+** reusable UI components
- **3** language support
- **Production-ready** deployment configuration

## 🎯 Cultural Impact

This platform aims to:
- Preserve endangered traditional crafts of Hong Kong
- Connect master craftsmen with eager learners
- Provide sustainable income for traditional artisans
- Document cultural heritage for future generations
- Foster appreciation for traditional craftsmanship

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm test && npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Submit a pull request

## 📚 Documentation

- [Project Journey](docs/PROJECT_JOURNEY.md) - Detailed development story
- [API Documentation](docs/API_DOCUMENTATION.md) - Complete API reference
- [Deployment Guide](docs/DEPLOYMENT_SUMMARY.md) - Production deployment
- [User Training](docs/USER_TRAINING.md) - User guides and tutorials

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Hong Kong traditional craftsmen who inspired this project
- The open-source community for excellent tools and libraries
- Cultural preservation organizations supporting this initiative

---

**Made with ❤️ for Hong Kong's cultural heritage** 🇭🇰
