# MongoDB Setup Guide for Development

## Quick Solutions:

### Option 1: Fix Network Issues (Recommended first try)
1. Check your internet connection
2. Try using a VPN if your ISP blocks certain connections
3. Check Windows Firewall settings
4. Temporarily disable antivirus to test

### Option 2: Use Local MongoDB (Fastest for development)
1. Install MongoDB Community Server:
   - Download from: https://www.mongodb.com/try/download/community
   - Or use Chocolatey: `choco install mongodb`
   - Or use winget: `winget install MongoDB.Server`

2. Start MongoDB service:
   - Windows: `net start MongoDB`
   - Or manually: `mongod --dbpath C:\data\db`

3. Update .env file:
   ```
   MONGO_URI=mongodb://localhost:27017/usersdatabase
   ```

### Option 3: Use MongoDB Atlas with Different Network
1. Try connecting from a different network (mobile hotspot)
2. Check MongoDB Atlas Network Access settings
3. Ensure your current IP is whitelisted (0.0.0.0/0 for development)

### Option 4: Use Docker MongoDB
1. Install Docker Desktop
2. Run: `docker run -d -p 27017:27017 --name mongodb mongo:latest`
3. Use: `MONGO_URI=mongodb://localhost:27017/usersdatabase`

## Test Commands:
```bash
# Test connection
node test-connection.js

# Start server
npm start
```
