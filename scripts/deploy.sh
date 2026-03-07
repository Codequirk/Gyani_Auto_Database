#!/bin/bash

echo "🚀 Pulling latest code..."

git pull origin test-code

echo "📦 Installing backend dependencies..."
cd backend
npm install

echo "♻️ Restarting backend..."
pm2 restart backend --update-env

echo "🏗 Building Admin Panel..."
cd ../frontend
npm install
npm run build
rm -rf /home/user/web/admin.connectadsadmin.tech/public_html/*
cp -r dist/* /home/user/web/admin.connectadsadmin.tech/public_html/

echo "🏗 Building Company Portal..."
cd ../company-portal
npm install
npm run build
rm -rf /home/user/web/connectadsadmin.tech/public_html/*
cp -r dist/* /home/user/web/connectadsadmin.tech/public_html/

echo "🏗 Building Auto Portal..."
cd ../auto-portal
npm install
npm run build
rm -rf /home/user/web/auto.connectadsadmin.tech/public_html/*
cp -r dist/* /home/user/web/auto.connectadsadmin.tech/public_html/

echo "✅ Deployment Complete!"
