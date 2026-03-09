import 'dotenv/config'
import serverless from 'serverless-http'
import { createApp } from '../../server/src/app.js'

const app = createApp()
const _buildVersion = '20260308-2100'

const handler = serverless(app)

export { handler }
