cd /home/user/projects/Gyani_Auto_Database/company-portal
npm run build
rm -rf /home/user/web/connectadsadmin.tech/public_html/*
cp -r dist/* /home/user/web/connectadsadmin.tech/public_html/
systemctl reload nginx
echo "✅ Company portal deployed"
