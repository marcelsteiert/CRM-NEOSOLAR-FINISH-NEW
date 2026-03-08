import 'dotenv/config'
import serverless from 'serverless-http'
import { createApp } from '../../server/src/app.js'

const app = createApp()
const handler = serverless(app)

export { handler }
