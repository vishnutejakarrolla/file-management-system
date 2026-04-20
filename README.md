<<<<<<< HEAD
=======
# file-management-system
>>>>>>> c43f148c89d4d582c4318b03eeb2938d4ae94e46
# Cloud Drive (File Management System)

A modern, highly secure, and stateless file management web application designed to behave like a lightweight Google Drive. Built with a Node.js backend, this platform securely encrypts files on the fly and stores them directly into a MongoDB database using GridFS, making it 100% ready for scalable cloud deployments.

## ✨ Features

* **Stateless Cloud Storage:** Files and folders are entirely managed within MongoDB (via GridFS), meaning the app can be deployed to ephemeral platforms like Heroku, Render, or Vercel without data loss.
* **Military-Grade Encryption:** Every single file uploaded or created is instantly encrypted using **AES-256-CTR streaming encryption** before it even reaches the database. Your files are entirely unreadable at rest.
* **Real-time Synchronization:** Powered by **Socket.IO**, file updates (uploads, deletions, sharing) happen instantly across all your open browser tabs.
* **Modern UI/UX:** A responsive, glassmorphism-styled dashboard featuring drag-and-drop uploads, an inline text-file editor, and built-in **Dark / Light Mode** toggling.
* **File Sharing:** Securely share encrypted files directly with other registered users on the platform.
* **Granular Organization:** Soft-delete (Trash bin), Star/Favorite files, and an auto-curated "Recent" files view.

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (Vanilla, custom variables), JavaScript (Vanilla)
* **Backend:** Node.js, Express.js
* **Database:** MongoDB (Mongoose & GridFSBucket)
* **Security:** JWT (JSON Web Tokens), bcryptjs, Node `crypto`
* **Real-time:** Socket.IO

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* [Node.js](https://nodejs.org/en/) installed.
* A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) Connection URI (or a local MongoDB instance).

### 1. Clone the Repository
```bash
git clone https://github.com/vishnutejakarrolla/file-management-system.git
cd file-management-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and add the following keys:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string_here
JWT_SECRET=generate_a_random_secure_string
ENCRYPTION_KEY=generate_a_32_byte_random_string
```
*(Note: If your MongoDB password contains special characters like `@`, be sure to URL-encode them. e.g., `@` becomes `%40`)*.

### 4. Run the Server
```bash
npm start
```
The server will boot up and be accessible at `http://localhost:5000`.

---

## ☁️ Deployment

This project is configured to be instantly deployed to modern cloud providers like Render, Heroku, or DigitalOcean App Platform.

1. Connect your GitHub repository to your host.
2. Ensure you specify the environment variables (`MONGO_URI`, `JWT_SECRET`, `ENCRYPTION_KEY`) in the host's dashboard.
3. The host will automatically detect the `start` script in the `package.json` and deploy your app safely.

## 📄 License
<<<<<<< HEAD
This project is open-source and available under the ISC License.
=======
This project is open-source and available under the ISC License.
>>>>>>> c43f148c89d4d582c4318b03eeb2938d4ae94e46
