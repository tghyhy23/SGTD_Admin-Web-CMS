# Sử dụng Node 20
FROM node:20-alpine

WORKDIR /app

# Copy package để cài library trước (tối ưu cache)
COPY package*.json ./
RUN npm install

# Copy toàn bộ code
COPY . .

# Build (nếu dự án cần build, ví dụ NestJS hoặc TS)
# Nếu dự án thuần JS không cần build thì comment dòng này lại cũng được
# RUN npm run build

# Mở cổng 5005 (khớp với log của bạn)
EXPOSE 8082

# Lệnh chạy server
# LƯU Ý: Kiểm tra package.json xem lệnh chạy production là gì.
# Thường là "npm run start:prod" hoặc "npm start"
CMD ["npm", "run", "start"]