# Stage 1: Build the React app
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app (Expo web export)
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy OpenSheetMusicDisplay from builder stage (installed via npm)
COPY --from=builder /app/node_modules/opensheetmusicdisplay/build/opensheetmusicdisplay.min.js \
    /usr/share/nginx/html/opensheetmusicdisplay.min.js

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]