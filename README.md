# BC.Game Crash Monitor - Web Dashboard

A real-time web dashboard to view and analyze crash data collected by the Chrome extension using Firebase Realtime Database.

## Features

- **Real-time Updates**: Live data streaming from Firebase Realtime Database
- **Filtering**: Filter by value range and time periods
- **Data Export**: Export filtered data to CSV
- **Responsive Design**: Works on desktop and mobile devices
- **Automatic Polling**: Fallback polling system ensures data freshness

## Setup Instructions

### 1. Configure Firebase Connection

Open `app.js` and replace the placeholder values with your Firebase configuration:

```javascript
this.firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};
```

**Important**: Use the same Firebase configuration from your Chrome extension setup. Make sure the `databaseURL` is correct.

### 2. Deploy the Web App

#### Option A: Local Development

1. Open `index.html` in a web browser
2. Or use a local server:

   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve .
   ```

#### Option B: Deploy to Netlify/Vercel

1. Upload the `web-app` folder to your hosting service
2. The app will be available at your domain

#### Option C: Deploy to Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Select your Firebase project
5. Set public directory to current folder
6. Deploy: `firebase deploy`

## Usage

### Dashboard Overview

- **Total Records**: Number of crash entries (filtered)
- **Last Update**: When the last data was received
- **Status**: Connection status to Firebase

### Filtering Options

- **Min/Max Value**: Filter crashes by value range
- **Time Range**: Show data from specific time periods
  - Last Hour
  - Last 24 Hours
  - Last 7 Days
  - All Time

### Controls

- **Pause/Resume**: Stop real-time updates temporarily
- **Export CSV**: Download filtered data as CSV file

## File Structure

```
web-app/
├── index.html      # Main HTML file with Firebase Realtime Database SDK
├── style.css       # Styling and layout
├── app.js          # JavaScript functionality with Firebase RTDB integration
└── README.md       # This file
```

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Troubleshooting

### No Data Showing

- Check Firebase configuration in `app.js`
- Verify the Chrome extension is running and storing data
- Check browser console for error messages
- Ensure Firebase Realtime Database is enabled

### Real-time Updates Not Working

- Check Firebase console for any errors
- Verify network connectivity
- The app includes automatic polling as fallback (every 5 seconds)
- Ensure `databaseURL` is correct in configuration

### Connection Errors

- Verify Firebase configuration values match the extension
- Check if Realtime Database is properly enabled in Firebase project
- Ensure you're using the correct Firebase SDK scripts

## Security Notes

- Firebase API keys are safe to use in client-side code
- Realtime Database in test mode allows all reads/writes
- For production, configure proper security rules
- Consider implementing authentication for production use

## Development

To modify the dashboard:

1. Edit `style.css` for visual changes
2. Modify `app.js` for functionality updates
3. Update `index.html` for structure changes

The app uses Firebase SDK v10 and vanilla JavaScript for maximum compatibility and performance.

## Firebase Realtime Database Features Used

- **Real-time Listeners**: Live updates when new data is added via `child_added` events
- **REST API**: Chrome extension uses REST API for data insertion
- **Offline Support**: Firebase SDK provides offline capabilities
- **Automatic Scaling**: Firebase handles scaling automatically
- **Simple Structure**: JSON-like data structure that's easy to work with

## Data Structure

The app expects data in this Firebase Realtime Database structure:

```
crash_values/
  ├── [unique_key_1]/
  │   ├── timestamp: "2025-01-14T10:30:00.000Z"
  │   ├── crash_value: "2.38×"
  │   ├── numeric_value: 2.38
  │   ├── url: "https://bc.game/game/crash"
  │   └── created_at: "2025-01-14T10:30:05.123Z"
  └── [unique_key_2]/
      └── ...
```

## Why Realtime Database?

- **Simpler setup**: No complex security rules needed for development
- **Better real-time support**: Built-in live updates with `child_added` listeners
- **Fewer permission issues**: Test mode works out of the box
- **Proven reliability**: Mature technology with automatic scaling
- **Easy integration**: Works seamlessly with both REST API and SDK
