#!/bin/bash

# RWA Platform Frontend - Installation Script
# This script helps you set up the frontend application

echo "=================================================="
echo "RWA Platform Frontend - Installation Setup"
echo "=================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Warning: Node.js version 18+ is recommended. You have version $(node -v)"
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"
echo ""

# Install dependencies
echo "Step 1: Installing dependencies..."
echo "This may take a few minutes..."
npm install

if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
fi

echo ""
echo "Dependencies installed successfully!"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Step 2: Setting up environment variables..."
    cp .env.local.example .env.local
    echo ".env.local file created from template"
    echo ""
    echo "IMPORTANT: Please edit .env.local and add your configuration:"
    echo "  - Backend URL"
    echo "  - Contract addresses"
    echo "  - Chain ID"
    echo ""
else
    echo "Step 2: .env.local already exists, skipping..."
    echo ""
fi

# Reminder about WalletConnect Project ID
echo "=================================================="
echo "NEXT STEPS:"
echo "=================================================="
echo ""
echo "1. Get a WalletConnect Project ID:"
echo "   - Visit: https://cloud.walletconnect.com"
echo "   - Create a new project"
echo "   - Copy your Project ID"
echo "   - Update lib/wagmiConfig.ts with your Project ID"
echo ""
echo "2. Configure your environment variables in .env.local:"
echo "   - NEXT_PUBLIC_BACKEND_URL"
echo "   - NEXT_PUBLIC_RWA_VAULT_ADDRESS"
echo "   - NEXT_PUBLIC_USDC_ADDRESS"
echo "   - NEXT_PUBLIC_SENIOR_TRANCHE_ADDRESS"
echo "   - NEXT_PUBLIC_JUNIOR_TRANCHE_ADDRESS"
echo ""
echo "3. Start the development server:"
echo "   npm run dev"
echo ""
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "=================================================="
echo "For detailed setup instructions, see SETUP.md"
echo "=================================================="
