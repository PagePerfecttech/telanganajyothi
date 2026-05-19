import { S3Client } from '@aws-sdk/client-s3'

if (!process.env.R2_ENDPOINT) {
  throw new Error('R2_ENDPOINT is missing from environment variables')
}
if (!process.env.R2_ACCESS_KEY_ID) {
  throw new Error('R2_ACCESS_KEY_ID is missing from environment variables')
}
if (!process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error('R2_SECRET_ACCESS_KEY is missing from environment variables')
}
if (!process.env.R2_BUCKET) {
  throw new Error('R2_BUCKET is missing from environment variables')
}
if (!process.env.R2_PUBLIC_URL) {
  throw new Error('R2_PUBLIC_URL is missing from environment variables')
}

export const s3Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  region: 'auto',
})

export const R2_BUCKET = process.env.R2_BUCKET
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL.endsWith('/')
  ? process.env.R2_PUBLIC_URL.slice(0, -1)
  : process.env.R2_PUBLIC_URL
