/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'whtuaqzgjpkoitfclpdi.supabase.co',
          port: '',
        },
      ],
    },
}

module.exports = nextConfig
