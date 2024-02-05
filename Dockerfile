# Use the official Node.js 16 image as a base
FROM node:16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock) to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# If you have native dependencies, you'll need extra tools
# RUN apk add --no-cache make gcc g++ python3

# Copy the rest of the application code
COPY . .

# Your application does not expose a server,
# but if it did, you would expose the port like so:
# EXPOSE 3000

# Run the application
CMD ["node", "index.js"]
