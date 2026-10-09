# Admin Guide

## Overview

The admin module controls the operational side of the tourism system. It lets authorized staff update crowd conditions, override sensor values, and publish visitor notices. This guide explains exactly how the system works for administrators.

## System architecture

The project has a simple two-part flow:

1. Frontend React app
   - Handles the visitor and admin interfaces
   - Shows map, site cards, notices, and recommendations
   - Fetches data from the backend API

2. Backend API and live admin data
   - Provides site and health endpoints
   - Stores admin overrides
   - Stores visitor notices
   - Supports admin login and authenticated updates

The frontend sends requests to the backend using the /api/live route when the live admin server is mounted. If the server is not connected, the app keeps the data locally in browser storage so the admin panel still works in the current browser.

## User and admin separation

The app makes a clear difference between visitor mode and admin mode:

- Visitor mode: read-only browsing, recommendations, directions, notices
- Admin mode: editing counts, changing capacity, posting notices, removing messages

The admin login is handled by the live backend. After a correct username and password, the system issues a token. That token is included in later requests so the admin actions are authorized.

## Admin sign in flow

When the admin clicks Admin sign in:

1. The app asks for username and password.
2. It sends a POST request to /api/live/login.
3. The backend compares the submitted values to the configured admin credentials.
4. If they match, the backend creates a secure random token and returns it to the browser.
5. The frontend stores that token in memory and allows access to the admin dashboard.

Default prototype credentials:

- Username: admin
- Password: admin123

These are used for the thesis prototype. In a real deployment, they should be replaced with environment-based credentials.

## What admin can change

The admin dashboard provides controls for each heritage site:

- current visitors
- capacity
- occupancy percentage
- live status label

When an admin changes a value:

1. The browser sends a PUT request to the backend for that site.
2. The server updates the override stored for that location.
3. The frontend recalculates occupancy percentage using the formula:

```text
occupancy % = (currentVisitors / capacity) * 100
```

4. The site status updates automatically between Low, Moderate, and High.

## How overrides work

The system supports two data sources:

- base site data from the backend or demo data
- admin override values that replace the live or default data for a given site

If an admin override exists, it takes priority over the standard site data. This lets staff temporarily fix crowd counts during events, maintenance, or special conditions.

The admin can also remove the override and return the site to its regular sensor or prototype data.

## Visitor notices flow

Admin notices are managed through the message composer.

When an admin sends a notice:

1. A message is created with the text and optional site target.
2. The backend stores the message in memory or file-based local data.
3. The frontend reads the updated notice list.
4. Visitors see the notice in the appropriate panel:
   - general message: visible across all sites
   - site-specific message: visible when that site is selected

This lets admins communicate operational updates without leaving the site page.

## Live server vs local-only behavior

The admin dashboard shows whether the app is connected to the backend server.

- Connected: updates are shared across devices and saved in server-backed data
- Not connected: changes remain in the browser's local storage only

This is important for prototype testing because the app still works even when the server is unavailable.

## Backend endpoints used by admin tools

The admin functions rely on these routes:

- POST /api/live/login
- PUT /api/live/sites/:id
- DELETE /api/live/sites/:id
- POST /api/live/messages
- DELETE /api/live/messages/:id

These endpoints authenticate the request with a bearer token and update the admin data set.

## Security and production considerations

For a real deployment, admin access should be protected more strictly:

- use environment variables for admin credentials
- change the default prototype username and password
- use HTTPS in production
- restrict admin accounts to authorized staff only
- avoid storing sensitive values in the browser permanently

## Admin workflow

A normal admin operation looks like this:

1. Sign in to the admin panel
2. Open the site list
3. Update visitor counts or capacity
4. Save the changes
5. Review the new occupancy status
6. Post a relevant visitor notice if needed
7. Sign out when the task is complete

## Role summary for admin

Admins can:

- update occupancy values
- adjust capacity limits
- override default site data
- publish notices to visitors
- remove outdated messages
- check whether the app is connected to the server

Admins cannot:

- view the system as a normal visitor without switching modes
- modify unrelated project infrastructure without backend changes
- bypass the login requirement for protected admin actions

## Troubleshooting

### Cannot sign in

- Confim the username and password are correct
- Check whether the backend service is running
- Refresh the page and try again

### Changes do not appear to users

- Confirm the app is connected to the backend
- Refresh the page
- Check that the token is still valid

### Notice is missing

- Confirm the text is not empty
- Choose the correct target site or general notice option
- Review the message list in the admin panel

## Recommended practice

Use admin updates only when you have real operational information. The system is intended to reflect actual conditions, so updates should be current, accurate, and easy for visitors to understand.
