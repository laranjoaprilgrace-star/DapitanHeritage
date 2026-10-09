# User Guide

## Overview

The Dapitan Rizal Heritage Tourism app is a visitor-facing tourism system for exploring Jose Rizal heritage locations in Dapitan City. It combines a map, site details, crowd status, recommendations, and customer notices into one interface.

This guide explains how the system works from the user's point of view.

## What the system does

The app has three main responsibilities:

1. Show heritage site information
2. Show crowd conditions for each site
3. Communicate updates to visitors

The front-end application runs in the browser and fetches data from the backend API. It displays:

- site names and addresses
- current visitor counts
- occupancy percentage
- site status: Low, Moderate, or High
- historical context and landmarks
- directions to the selected site
- messages sent by the admin

## How the user flow works

When a visitor opens the app:

1. The main screen appears with a visitor entrance and a separate admin sign-in option.
2. The visitor chooses Continue as visitor.
3. The website loads the list of heritage sites from the backend or falls back to local demo data if the server is offline.
4. The map and site panels are displayed with the current occupancy information.
5. The visitor can search, filter, view site details, and choose a destination.

The selected site card shows:

- visitors now
- capacity
- percentage occupied
- description
- historical background
- recommended highlights
- directions to the location

## How occupancy is calculated

For each site, the system uses this formula:

```text
occupancy % = (currentVisitors / capacity) * 100
```

The status is then determined as:

- Low: less than 40%
- Moderate: 40% to 59%
- High: 60% and above

This calculation is done on the front-end after the site data is loaded.

## How site data is loaded

The system uses the backend API endpoint:

```http
GET /api/sites
```

This returns all heritage sites with their current visitor counts and capacity values.

If the backend is not running, the app falls back to built-in sample data stored in the browser so the interface still works.

## How messages appear to users

Admins can send notices to:

- all sites
- one specific site

These messages are shown in the visitor interface as notices under the current selected site or across the app if they are general notices.

Examples of visitor notices:

- temporary closure
- weather or safety update
- event notice
- crowd management advisory

## Map and navigation behavior

The app uses OpenStreetMap tiles and places markers for each heritage site. When a user clicks a marker or selects a site, the app:

- highlights the site
- shows site details
- updates the “selected site” panel
- lets the user get directions from their current location

If browser geolocation is available, the app can generate walking directions to the chosen destination.

## Role summary for users

Visitors can:

- browse the heritage map
- search and select heritage sites
- view current crowd levels
- read historical information
- get route directions
- read messages from the admin team

Visitors cannot:

- edit site occupancy or capacity
- change visitor counts
- send notices
- access the admin dashboard

## Accessing the app

Start the project with:

```powershell
npm install
npm run install:all
npm run dev
```

Then open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Troubleshooting

### App loads but no site data appears

- Confirm the backend server is running
- Check whether port 5000 is available
- Refresh the browser

### Map is blank or tiles do not load

- Check the internet connection
- Reload the page

### Status looks outdated

- The app refreshes automatically at intervals
- If the server is disconnected, the app may show fallback demo data until it reconnects

## Best practice

Before visiting a destination, check:

- site crowd level
- recommendations tab
- selected site details
- current admin notices

This helps visitors avoid crowded places and plan a smoother heritage tour.
