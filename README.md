# 🌍 SahaayaSetu – AI-Powered Disaster Response & Coordination Platform

SahaayaSetu is an AI-powered disaster survivor coordination system designed specifically for Indian disaster management conditions.

During disasters such as floods, earthquakes, or cyclones, rescue operations often suffer from poor coordination, delayed response, and inefficient resource allocation.
SahaayaSetu solves this by creating a centralized digital ecosystem that connects survivors, NGOs, volunteers, donors, and administrators to coordinate rescue, relief, reunification, and recovery efforts.

The platform uses AI-based prioritization to ensure that the most critical survivors receive help first.

📌 Problem Statement

During disaster situations:

• Information becomes scattered across different organizations
• Rescue operations follow first-come-first-serve instead of urgency
• Relief resources like food and shelter are often mismanaged or duplicated
• Survivors struggle to find shelters, report missing persons, or request help
• Coordination between NGOs, volunteers, and authorities becomes difficult

These issues result in delayed rescue operations and inefficient disaster management.

💡 Solution

SahaayaSetu introduces a smart disaster management platform that:

• Connects survivors, NGOs, workers, donors, and administrators
• Uses AI-based rescue prioritization to identify critical survivors
• Enables real-time resource tracking for shelters, food, and medical aid
• Allows survivors to report missing persons and locate shelters
• Provides direct donation and compensation systems
• Integrates chatbot and voice assistants for emergency guidance

The goal is to create a coordinated and intelligent disaster response system.

🚀 Features
🛠 Admin Dashboard

• Manage NGOs
• Assign tasks to workers
• Grant financial compensation to survivors
• Monitor disaster response operations

🏢 NGO Portal

• Update shelter availability
• Update food supply and medical resources
• Coordinate relief distribution

🧑‍🚒 Worker / Volunteer Portal

• Receive assigned rescue tasks
• Update task progress in real-time
• Register skills and availability

🧍 Survivor Portal

• Report missing persons
• View nearby shelter availability
• Access emergency assistance

💰 Donor Portal

• Directly donate to disaster relief operations
• Transparent funding system

🤖 AI Assistance

• AI Chatbot for emergency support
• Voice assistant for easier accessibility

🧠 AI Rescue Prioritization

The system analyzes:

• Injury level
• Age
• Medical condition
• Disaster severity zone
• Number of dependents

Based on this data, survivors are categorized into High, Medium, or Low rescue priority, ensuring the most critical victims are helped first.

🛠️ Tech Stack
Frontend

• React.js
• HTML
• CSS
• JavaScript

Backend

• Node.js
• Express.js

Database

• AWS Cloud Database

Security

• Password hashing
• Secure authentication system

AI Components

• AI-based rescue prioritization
• Chatbot assistant
• Voice assistance system

🏗️ System Architecture (High Level)

The frontend interface allows different users (admin, NGO, survivor, worker, donor) to interact with the system.

The Node.js backend manages:

APIs

authentication

disaster coordination logic

compensation and donation transactions

The AWS cloud database stores:

survivor records

NGO resources

shelter information

task assignments

donations and compensation data

AI modules process survivor data to prioritize rescue operations.


📂 Project Repository

GitHub Repository:

🔗 https://github.com/rethish2006sm/Sahaayasetu

⚙️ Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/rethish2006sm/Sahaayasetu.git
cd Sahaayasetu
2️⃣ Install Dependencies

For backend:

npm install
3️⃣ Configure Environment Variables

Create a .env file and configure database credentials.

Example:

DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
JWT_SECRET=your_secret_key
4️⃣ Run the Backend Server
npm run dev
5️⃣ Run the Frontend

Start the frontend development server:

npm run dev

Open the application in your browser.


🔒 Security

To ensure data privacy and protection:

• All user passwords are securely hashed
• Sensitive data is stored in AWS cloud infrastructure
• Authentication is implemented using secure backend APIs


🎯 Future Improvements

• Satellite disaster data integration
• Real-time GPS-based rescue tracking
• AI-based disaster prediction models
• Mobile application for offline disaster communication
• Government disaster management system integration


📄 Project Documentation

Document Link:
https://siescms-my.sharepoint.com/:w:/g/personal/karthikvmce124_gst_sies_edu_in/IQAmpcPY44pATbz0rthPLCbDAe4MM03_x_jq41W45sHGCHE?e=6DXaMP


🌟 Conclusion

SahaayaSetu transforms disaster management from a chaotic response into an intelligent, AI-driven coordination system.

By connecting survivors, NGOs, volunteers, donors, and administrators on a unified platform, the system ensures that help reaches the right people, at the right time.
