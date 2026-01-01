FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install tailwindcss @tailwindcss/vite react-icons axios react-chartjs-2 chart.js uuid react-responsive-carousel

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--" , "--host"]