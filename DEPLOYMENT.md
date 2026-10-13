# Hosting & Deployment Guide

This application is ready to be hosted as a public website on cloud platforms like **Render**, **Railway**, or **DigitalOcean**.

---

## 🌟 Option A: Deploy to Render (Recommended & Free/Easy)

[Render](https://render.com/) can build and run this application with one click using the included Dockerfile.

### Steps:
1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for attendance generator"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Create a Web Service on Render:**
   - Go to [dashboard.render.com](https://dashboard.render.com/).
   - Click **New +** $\rightarrow$ **Web Service**.
   - Connect your GitHub repository.
   - For **Runtime**, select **Docker**.
   - (Render automatically detects the [`Dockerfile`](file:///d:/Gk-attendence/New%20folder/Dockerfile) at the root).
   - Click **Deploy Web Service**.

3. **Done!**
   - Render will build the React frontend, install Python + headless LibreOffice, and give you a live HTTPS public URL (e.g. `https://attendance-generator.onrender.com`).

---

## 🌟 Option B: Deploy to Railway

[Railway.app](https://railway.app/) is fast and supports Docker natively.

### Steps:
1. Push code to GitHub.
2. Go to [railway.app](https://railway.app/) $\rightarrow$ **New Project** $\rightarrow$ **Deploy from GitHub repo**.
3. Railway automatically detects the `Dockerfile` and builds the website.
4. Under project **Settings** $\rightarrow$ **Networking**, click **Generate Domain**.

---

## 🌟 Option C: Instant Local Network Sharing (No Cloud Needed)

If you just want your colleagues on the same Wi-Fi or office network to use it right now without paying for hosting:

1. In PowerShell:
   ```powershell
   ipconfig
   ```
   Find your **IPv4 Address** (e.g., `192.168.1.45`).

2. Start the app:
   - Backend: `npm start` in `backend`
   - Frontend: `npm run dev -- --host` in `frontend`

3. Your colleagues can open `http://192.168.1.45:5173` on their phones, laptops, or tablets!
