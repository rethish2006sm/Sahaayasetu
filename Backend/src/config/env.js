import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || '',
  dbName: process.env.DB_NAME || 'sahaayasetu',
  jwtSecret: process.env.JWT_SECRET || 'replace_this_with_a_long_secret',
}
