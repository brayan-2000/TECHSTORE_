import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultCredentialsPath = path.join(__dirname, 'firebase-service-account.json.json')
const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || defaultCredentialsPath
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
  || fs.readFileSync(credentialsPath, 'utf8')
const serviceAccount = JSON.parse(serviceAccountJson)

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  })
}

export const db = getFirestore()
