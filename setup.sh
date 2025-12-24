#!/bin/bash

echo "Admin Panel - Complete Setup"
echo "============================"
echo ""

echo "Step 1: Setting up database..."
if ! command -v createdb &> /dev/null; then
  echo "PostgreSQL not found. Please install PostgreSQL first."
  exit 1
fi

createdb admin_panel_db 2>/dev/null || echo "Database may already exist"

echo ""
echo "Step 2: Setting up backend..."
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created .env file. Please update with your credentials."
fi

# Run migrations
echo "Running database migrations..."
npm run migrate

# Seed database
echo "Seeding database with initial data..."
npm run seed

echo ""
echo "Backend setup complete!"
echo ""

echo "Step 3: Setting up frontend..."
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
  cp .env.example .env
fi

echo ""
echo "Frontend setup complete!"
echo ""

echo "============================"
echo "Setup Complete!"
echo ""
echo "To start the application:"
echo "1. Terminal 1: cd backend && npm run dev"
echo "2. Terminal 2: cd frontend && npm run dev"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"
echo ""
echo "Default Login:"
echo "Email: pragna@company.com"
echo "Password: Test1234"
