This is the **Node.js + Express backend** of the **Inventory Management Dashboard** built with the MERN stack.  
It provides REST APIs for **authentication, product management, invoices, statistics.

**Setup Instructions:

Clone the Repository: 
- git clone https://github.com/ankitakosare1/form-builder-backend.git 
- cd server

Install Dependencies: npm install

Configure Environment Variables: 
- MONGO_URI=<your-mongo-uri>
- JWT_SECRET=<your-secret>
- EMAIL_USER=<your-email>
- EMAIL_PASS=<your-app-password>
- FRONTEND_URL=https://form-builder-frontend.netlify.app/

Run: npm start

Features Implemented
- User Authentication (JWT-based login/signup)  
- Product Management (CRUD, CSV Upload, Availability Status)  
- Invoice Management (Generate, Update, PDF Export)    
- Statistics & Graphs (Sales, Purchases, Top Products)  
- Forgot Password with OTP (Email via Nodemailer)  
- MongoDB Atlas Integration & Daily Cron Job  
- Backend Pagination & Search  


Demo Credentials For testing APIs: 
Email: waits.for.friday@gmail.com 
Password: Ak@123456