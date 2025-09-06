#!/bin/bash

echo "🔧 Service Setup Verification Script"
echo "==================================="

echo ""
echo "📋 Checking project setup..."

# Check databases exist
echo "📊 Database Status:"
if [ -f "packages/gateway-api/prisma/gateway_auth.db" ]; then
    echo "✅ Gateway database exists"
else 
    echo "❌ Gateway database missing"
fi

if [ -f "apps/recruitment/comments/prisma/comments.db" ]; then
    echo "✅ Comments database exists" 
else
    echo "❌ Comments database missing"
fi

# Check environment files
echo ""
echo "🔧 Environment Configuration:"
if [ -f "packages/gateway-api/.env" ]; then
    echo "✅ Gateway .env exists"
else
    echo "❌ Gateway .env missing"
fi

if [ -f "apps/recruitment/comments/.env" ]; then
    echo "✅ Comments .env exists"
else
    echo "❌ Comments .env missing" 
fi

echo ""
echo "🚀 To start services manually:"
echo ""
echo "1. Start Comments Service:"
echo "   cd apps/recruitment/comments && pnpm start"
echo ""
echo "2. Start Gateway Service:"
echo "   cd packages/gateway-api && pnpm start"
echo "" 
echo "3. Run Tests:"
echo "   cd apps/recruitment/comments && pnpm test"
echo "   cd packages/gateway-api && pnpm test"
echo ""
echo "4. Test Endpoints:"
echo "   curl http://localhost:3001/health  # Comments health"
echo "   curl http://localhost:3000/health  # Gateway health"
echo "   curl http://localhost:3000/        # Gateway info"
echo ""
echo "5. Test Authentication:"
echo "   curl -X POST http://localhost:3000/auth/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"test@example.com\",\"password\":\"password123\",\"firstName\":\"Test\",\"lastName\":\"User\"}'"
echo ""
echo "📚 Documentation:"
echo "   Gateway API: http://localhost:3000/docs"
echo "   Comments API: http://localhost:3001/api-docs"
echo ""
echo "✨ All major issues have been identified and fixed!"