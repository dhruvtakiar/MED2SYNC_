# MED2SYNC frontend

A React + Vite frontend for the MED2SYNC medical volunteer coordination platform.

## Run locally

1. Copy `.env.example` to `.env` if the API is running on a different URL.
2. Run `npm install`.
3. Run `npm run dev`.

The design remains usable while the API is unavailable through data isolated in `src/data/mockData.js`. API configuration and JWT attachment live in `src/services/api.js`.
