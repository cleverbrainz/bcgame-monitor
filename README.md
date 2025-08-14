# BC.Game Crash Monitor - Web Dashboard

A real-time web dashboard to view and analyze crash data collected by the Chrome extension.

## Features

- **Real-time Updates**: Live data streaming from Supabase database
- **Analytics Dashboard**: Average values, highest crashes, and statistics
- **Filtering**: Filter by value range and time periods
- **Data Export**: Export filtered data to CSV
- **Responsive Design**: Works on desktop and mobile devices

## Setup Instructions

### 1. Configure Database Connection

Open `app.js` and replace the placeholder values:

```javascript
this.supabaseUrl = "YOUR_SUPABASE_URL";
this.supabaseKey = "YOUR_SUPABASE_ANON_KEY";
```

Use the same Supabase credentials from your Chrome extension setup.

### 2. Enable Real-time Features

In your Supabase dashboard:

1. Go to "Database" → "Replication"
2. Enable replication for the `crash_values` table
3. **Important**: Make sure "Enable insert" is checked for the table
4. Go to "Database" → "Publications" and verify `supabase_realtime` publication includes your table
5. If real-time still doesn't work, the app includes automatic polling as a fallback (checks every 5 seconds)

### 3. Deploy the Web App

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

#### Option C: Deploy to Supabase (Static Hosting)

1. In your Supabase project, go to "Storage"
2. Create a public bucket called "web-app"
3. Upload all files from the `web-app` folder
4. Access via the public URL

## Usage

### Dashboard Overview

- **Total Records**: Number of crash entries (filtered)
- **Last Update**: When the last data was received
- **Status**: Connection status to Supabase

### Analytics Cards

- **Average Crash Value**: Mean of all crash values
- **Highest Crash**: Maximum crash value recorded
- **Values > 2.00×**: Count of high-value crashes
- **Values > 5.00×**: Count of very high-value crashes

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
├── index.html      # Main HTML file
├── style.css       # Styling and layout
├── app.js          # JavaScript functionality
└── README.md       # This file
```

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Troubleshooting

### No Data Showing

- Check Supabase credentials in `app.js`
- Verify the Chrome extension is running and storing data
- Check browser console for error messages

### Real-time Updates Not Working

- Ensure replication is enabled in Supabase
- Check network connectivity
- Verify the table name matches (`crash_values`)

### Connection Errors

- Verify Supabase URL and API key
- Check if the database table exists
- Ensure Row Level Security is properly configured

## Security Notes

- The anon key is safe to use in client-side code
- Row Level Security should be configured in Supabase
- Consider rate limiting for production use

## Development

To modify the dashboard:

1. Edit `style.css` for visual changes
2. Modify `app.js` for functionality updates
3. Update `index.html` for structure changes

The app uses vanilla JavaScript and CSS for maximum compatibility and performance.
