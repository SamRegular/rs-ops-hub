#!/bin/bash
echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" > .env.production
echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> .env.production
npm run build