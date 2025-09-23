# UniFi Stock Tracker Web

A modern web application for monitoring Ubiquiti UniFi product stock across global stores. Built with React TypeScript frontend and Node.js Express backend, featuring real-time WebSocket notifications and automated monitoring.

## 🌟 Features

### 📦 Stock Checking
- **Multi-Store Support**: Monitor stock across US, EU, UK, Brazil, India, Japan, Taiwan, Singapore, Mexico, and China stores
- **Dual API Support**: Modern GraphQL API for US/EU/UK stores, legacy JSON API for other regions  
- **Advanced Search**: Search products by name, SKU, or category
- **Collection Filtering**: Filter by specific product collections/categories
- **Real-time Data**: Live stock information with automatic updates

### 📊 Real-time Monitoring
- **Automated Monitoring**: Set up monitoring sessions for specific products
- **Customizable Intervals**: Configure check frequency (10 seconds to 1 hour)
- **WebSocket Notifications**: Real-time updates without page refresh
- **Multiple Notification Types**: Web notifications, sound alerts, and visual indicators
- **Session Management**: Start, stop, resume, and delete monitoring sessions

### 🔔 Smart Notifications
- **Instant Alerts**: Get notified the moment products come in stock
- **Sound Notifications**: Audio alerts for availability changes
- **Browser Notifications**: Native browser notification support
- **Product Links**: Direct links to purchase pages when stock becomes available

### 📈 Dashboard & Analytics
- **Monitoring Overview**: View all active monitoring sessions
- **Statistics**: Track total checks, sessions, and store distribution
- **Session History**: View monitoring history and patterns
- **Visual Charts**: Store distribution and system status

### 🎨 Modern UI/UX
- **Material Design**: Clean, modern interface using Material-UI
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Real-time Updates**: Live data updates via WebSocket
- **Intuitive Navigation**: Easy-to-use interface for all skill levels

## 🏗️ Architecture

### Backend (Node.js + Express)
- **RESTful API**: Clean API endpoints for all functionality
- **WebSocket Support**: Real-time communication using Socket.IO
- **SQLite Database**: Local storage for monitoring sessions and history
- **Cron Jobs**: Automated monitoring checks every minute
- **Error Handling**: Comprehensive error handling and logging

### Frontend (React + TypeScript)
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development with full IntelliSense
- **Material-UI**: Professional UI components and theming
- **React Router**: Client-side routing for SPA experience
- **Socket.IO Client**: Real-time communication with backend

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+ (Node.js 18+ recommended for security)
- Git

### Installation & Setup

1. **Clone the repository**
   ```bash
   git checkout UnifiWebCheck
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```
   
   > **Note**: You may see deprecation warnings during installation. These are from transitive dependencies and are safe to ignore. See [SECURITY.md](SECURITY.md) for details on handling security warnings.

3. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts both:
   - Backend server: http://localhost:5000
   - React development server: http://localhost:3000

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - Health check: http://localhost:5000/api/health

### Production Deployment

1. **Build the React app**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

## 📖 Usage Guide

### Stock Checking
1. **Select Store**: Choose from US, EU, UK (modern) or legacy stores
2. **Filter Collections**: Optionally filter by product categories
3. **Search Products**: Search by name or SKU, or browse all products
4. **View Results**: See availability, pricing, and product details

### Setting Up Monitoring
1. **Navigate to Monitor Page**: Click "Monitor" in the sidebar
2. **Create Monitor**: Click "Create Monitor" button
3. **Configure Products**: Add specific products by name or SKU
4. **Set Intervals**: Choose how frequently to check (minimum 10 seconds)
5. **Enable Notifications**: Configure web and sound notifications
6. **Start Monitoring**: The system will automatically check and alert you

### Managing Sessions
- **View Sessions**: See all monitoring sessions on the dashboard
- **Control Sessions**: Start, stop, resume, or delete sessions
- **Force Checks**: Manually trigger immediate stock checks
- **View History**: Track check counts and timing information

## 🛠️ API Reference

### Stock Endpoints
- `GET /api/stock/stores` - Get available stores
- `GET /api/stock/stores/:store` - Get stock for a store
- `GET /api/stock/stores/:store/search?q=query` - Search products
- `GET /api/stock/stores/:store/collections` - Get store collections

### Monitoring Endpoints
- `GET /api/monitoring/sessions` - Get monitoring sessions
- `POST /api/monitoring/sessions` - Create monitoring session
- `POST /api/monitoring/sessions/:id/stop` - Stop session
- `POST /api/monitoring/sessions/:id/resume` - Resume session
- `DELETE /api/monitoring/sessions/:id` - Delete session

### WebSocket Events
- `product-available` - Product becomes available
- `availability-alert` - Multiple products available
- `check-completed` - Monitoring check completed

## 🌍 Supported Stores

### Modern API (GraphQL)
- **USA**: store.ui.com
- **Europe**: eu.store.ui.com  
- **UK**: uk.store.ui.com

### Legacy API (JSON)
- **Brazil**: br.store.ui.com
- **India**: store-ui.in
- **Japan**: jp.store.ui.com
- **Taiwan**: tw.store.ui.com
- **Singapore**: sg.store.ui.com
- **Mexico**: mx.store.ui.com
- **China**: store.ui.com.cn

## ⚙️ Configuration

### Environment Variables
```env
NODE_ENV=development
PORT=5000
DATABASE_PATH=./server/data/stock_tracker.db
```

### Monitoring Settings
- **Minimum Interval**: 10 seconds
- **Maximum Interval**: 3600 seconds (1 hour)
- **Default Interval**: 60 seconds
- **Automatic Cleanup**: Removes old data after 7 days

## 💻 Technology Stack

### Backend
- **Node.js** + **Express.js** - Server framework
- **Socket.IO** - WebSocket communication
- **SQLite** - Local database
- **Axios** - HTTP client for API calls
- **Node-cron** - Scheduled monitoring tasks

### Frontend  
- **React 18** + **TypeScript** - UI framework with type safety
- **Material-UI (MUI)** - Component library and theming
- **React Router** - Client-side routing
- **React Hook Form** - Form management
- **Socket.IO Client** - WebSocket communication
- **React Toastify** - Toast notifications
- **Recharts** - Data visualization
- **Date-fns** - Date formatting utilities

## 🔧 Development

### Project Structure
```
├── server/                 # Backend Node.js application
│   ├── services/          # Business logic services
│   ├── routes/            # API route handlers
│   ├── database/          # Database management
│   └── data/              # SQLite database storage
├── client/                # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main application pages
│   │   ├── services/      # API and socket services
│   │   └── types/         # TypeScript type definitions
│   └── public/            # Static assets
```

### Available Scripts
```bash
npm run dev          # Start both backend and frontend in development
npm run server:dev   # Start only backend server with nodemon
npm run client:dev   # Start only React development server
npm run build        # Build React app for production
npm run start        # Start production server
npm run install:all  # Install dependencies for both backend and frontend
```

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Original PowerShell module by Przemyslaw Klys (Evotec)
- Ubiquiti for their product APIs
- Material-UI team for the excellent component library
- React and Node.js communities

## ⚠️ Disclaimer

This application is not affiliated with or endorsed by Ubiquiti Inc. It's a community tool for monitoring product availability.

---

**Happy Stock Tracking! 📦🚀**