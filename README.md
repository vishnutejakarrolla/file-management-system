# 📁 Cloud Drive (File Management System)

A modern, highly secure, and stateless file management web application designed to behave like a lightweight Google Drive. Built with a Node.js backend, this platform securely encrypts files on the fly and stores them directly into a MongoDB database using GridFS — making it fully scalable for cloud deployments.

---

## 🚀 Live Demo
👉 https://file-management-system-livid.vercel.app

---

## ✨ Features

- **Stateless Cloud Storage:**  
  Files and folders are fully managed within MongoDB (GridFS), allowing deployment on ephemeral platforms like Vercel, Render, or Heroku without data loss.

- **Military-Grade Encryption:**  
  Every file is encrypted using **AES-256-CTR streaming encryption** before being stored. Data remains unreadable at rest.

- **Real-time Synchronization:**  
  Powered by **Socket.IO**, updates such as uploads, deletions, and sharing are reflected instantly across all active sessions.

- **Modern UI/UX:**  
  Clean glassmorphism-inspired interface with:
  - Drag-and-drop uploads  
  - Inline text editor  
  - Dark / Light mode toggle  

- **File Sharing:**  
  Securely share files with other registered users.

- **Advanced Organization:**  
  Includes:
  - Trash (soft delete)  
  - Star/Favorites  
  - Recent files tracking  

---

## 🛠️ Tech Stack

**Frontend**
- HTML5  
- CSS3 (Vanilla + Custom Variables)  
- JavaScript (Vanilla)  

**Backend**
- Node.js  
- Express.js  

**Database**
- MongoDB (Mongoose + GridFSBucket)  

**Security**
- JWT (JSON Web Tokens)  
- bcryptjs  
- Node.js `crypto` module  

**Real-time**
- Socket.IO  

---

## ⚙️ Getting Started (Local Development)

### Prerequisites
- Node.js installed  
- MongoDB Atlas URI (or local MongoDB instance)

---

### 1. Clone the Repository
```bash
git clone https://github.com/vishnutejakarrolla/file-management-system.git
cd file-management-system
2. Install Dependencies
npm install
3. Environment Variables

Create a .env file in the root directory:

PORT=5000
MONGO_URI=your_mongodb_connection_string_here
JWT_SECRET=your_secure_random_string
ENCRYPTION_KEY=your_32_byte_random_string

⚠️ Note: If your MongoDB password contains special characters (e.g., @), URL-encode them (@ → %40).

4. Run the Server
npm start

App will run at:

http://localhost:5000
☁️ Deployment

This app is ready for deployment on:

Vercel
Render
Heroku
DigitalOcean App Platform
Steps:
Connect your GitHub repository
Add environment variables (MONGO_URI, JWT_SECRET, ENCRYPTION_KEY)
Deploy — the platform will auto-detect your start script
