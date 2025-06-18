@echo off
echo 🐳 Setting up Local MongoDB with Docker...
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not in PATH
    echo 📖 Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✅ Docker is available
echo.

REM Stop and remove existing MongoDB container if it exists
echo 🧹 Cleaning up existing MongoDB container...
docker stop mongodb-dev >nul 2>&1
docker rm mongodb-dev >nul 2>&1

echo 🚀 Starting MongoDB container...
docker run -d ^
  --name mongodb-dev ^
  -p 27017:27017 ^
  -e MONGO_INITDB_ROOT_USERNAME=admin ^
  -e MONGO_INITDB_ROOT_PASSWORD=password ^
  -e MONGO_INITDB_DATABASE=usersdatabase ^
  mongo:latest

if %errorlevel% neq 0 (
    echo ❌ Failed to start MongoDB container
    pause
    exit /b 1
)

echo ✅ MongoDB container started successfully!
echo.
echo 📋 Connection details:
echo    Host: localhost
echo    Port: 27017
echo    Username: admin
echo    Password: password
echo    Database: usersdatabase
echo.
echo 🔗 Update your .env file with:
echo    MONGO_URI=mongodb://admin:password@localhost:27017/usersdatabase?authSource=admin
echo.
echo 📖 Container management commands:
echo    Stop:    docker stop mongodb-dev
echo    Start:   docker start mongodb-dev
echo    Remove:  docker rm mongodb-dev
echo.
pause
