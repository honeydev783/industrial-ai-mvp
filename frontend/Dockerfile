# Dockerfile.frontend
FROM node:18

WORKDIR /app
COPY frontend/ .
RUN npm install && npm run build
# Install serve to serve the production build
RUN npm install -g serve

# Tell Docker to expose port 3000
EXPOSE 3000

# Command to run the server
CMD ["serve", "-s", "build", "-l", "3000"]