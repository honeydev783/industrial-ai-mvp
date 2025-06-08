# Dockerfile.frontend
FROM node:18 AS builder

WORKDIR /app

# COPY package*.json ./
# COPY tsconfig.* ./
# COPY vite.config.* ./
# COPY index.html ./ 
# COPY public ./
# COPY src ./
COPY . .

RUN npm install
RUN npm run build

# Serve Stage with NGINX
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
# # Remove default config
# RUN rm /etc/nginx/conf.d/default.conf

# # Add custom config
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# # Copy built static files
# COPY --from=builder /app/dist /usr/share/nginx/html

# EXPOSE 80

# CMD ["nginx", "-g", "daemon off;"]
# FROM node:18

# WORKDIR /app
# COPY frontend/ .
# RUN npm install && npm run build
# # Install serve to serve the production build
# RUN npm install -g serve

# # Tell Docker to expose port 3000
# EXPOSE 3000

# # Command to run the server
# CMD ["serve", "-s", "build", "-l", "3000"]