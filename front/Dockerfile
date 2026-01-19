FROM node:20-alpine

WORKDIR /app

# Expose Next.js port
EXPOSE 5173

# Install dependencies and start dev server
# Dependencies are installed at runtime because source is mounted as volume
CMD ["sh", "-c", "npm install && npx next dev --turbopack -p 5173 -H 0.0.0.0"]
