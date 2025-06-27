#!/bin/bash

echo "🚀 Starting deployment setup..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npm run prisma:generate

# Run database migrations
echo "🗄️ Running database migrations..."
npm run prisma:migrate

# Seed the database
echo "🌱 Seeding database..."
npm run prisma:seed

echo "✅ Deployment setup completed!"
echo ""
echo "📋 Database has been populated with:"
echo "- Users (admin@gmail.com / admin123)"
echo "- Categories from newCat.json"
echo "- Products from Products1.csv"
echo ""
echo "🔗 Your API is ready to use!" 