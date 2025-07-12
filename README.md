
# EzSociety - Society Management PWA

A complete Progressive Web App (PWA) for society management including visitor tracking, resident directory, complaints management, and notice board.

## Features

- 📱 **Progressive Web App** - Works offline, installable on mobile devices
- 🏠 **Multi-user System** - Admin, Guard, and Resident access levels
- 👥 **Visitor Management** - Photo capture, flat assignment, SMS notifications
- 📢 **Notice Board** - Real-time society announcements
- 📝 **Complaints System** - Submit and track maintenance issues
- 📊 **Data Management** - Export functionality for admins
- 🔄 **Real-time Sync** - Firebase Realtime Database integration
- 🌙 **Dark/Light Mode** - Theme switching support

## Live Demo

[View Live Demo](https://yourusername.github.io/ezsociety) (Replace with your actual GitHub Pages URL)

## Quick Setup

### 1. Firebase Configuration
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Realtime Database
3. Copy your configuration and update `script.js`

### 2. Local Development
```bash
npm install
npm run dev
```

### 3. Deploy to GitHub Pages
1. Fork this repository
2. Update Firebase configuration in `script.js`
3. Enable GitHub Pages in repository settings
4. Push to main branch - automatic deployment via GitHub Actions

## Demo Credentials

### Admin Login
- Username: `admin`
- Password: `admin123`

### Guard Login
- Guard ID: `guard001` / Password: `security123`
- Guard ID: `guard002` / Password: `safety456`

### Resident Login
- See `residents-credentials.md` for all 112 resident accounts
- Example: Name: John Doe, Flat: A-101, Password: apple101

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Firebase Realtime Database
- **Build Tool**: Vite
- **PWA**: Service Worker, Web App Manifest
- **Deployment**: GitHub Pages, GitHub Actions

## Project Structure

```
├── index.html          # Main HTML file
├── script.js           # Core JavaScript functionality
├── style.css           # Styling and responsive design
├── sw.js              # Service Worker for PWA functionality
├── manifest.json      # Web App Manifest
├── attached_assets/   # Images and icons
├── .github/workflows/ # GitHub Actions for deployment
└── docs/              # Documentation
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 17+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue in the GitHub repository.

---

**Made with ❤️ for modern society management**
