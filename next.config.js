/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // 4.5 MB chunks + headroom
    }
  }
}

module.exports = nextConfig
