/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '120mb'
    }
  }
}

module.exports = nextConfig
