#!/bin/bash

echo "🚀 Starting Admin Panel Deployment..."

# Step 1: Go to admin portal directory
cd /home/user/projects/Gyani_Auto_Database/frontend || exit

echo "📦 Building admin panel..."
npm run build

echo "🧹 Removing old admin panel files..."
sudo rm -rf /home/user/web/admin.connectadsadmin.tech/public_html/*

echo "📁 Copying new build files..."
sudo cp -r dist/* /home/user/web/admin.connectadsadmin.tech/public_html/

echo "🔐 Fixing permissions..."
sudo chown -R user:user /home/user/web/admin.connectadsadmin.tech/public_html

echo "✅ Admin Panel deployed successfully!"
