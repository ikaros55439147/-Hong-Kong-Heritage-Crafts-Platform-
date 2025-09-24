@echo off
echo 🚀 Starting Hong Kong Heritage Crafts Platform Development Setup

REM Check if Docker is available
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

REM Start Docker services
echo 📦 Starting Docker services...
docker-compose up -d

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak >nul

REM Generate Prisma client
echo 🔧 Generating Prisma client...
npm run db:generate

REM Run database migrations
echo 🗄️ Running database migrations...
npm run db:migrate

REM Start development server
echo 🌟 Starting development server...
npm run dev