import 'dotenv/config'
import serverless from 'serverless-http'
import { createApp } from '../../server/src/app.js'

const app = createApp()

// serverless-http wandelt Express → Lambda-Handler um
// Kein basePath noetig – Netlify sendet den Original-Pfad (/api/v1/...)
const handler = serverless(app)

export { handler }
