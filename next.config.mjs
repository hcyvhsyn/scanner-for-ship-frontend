/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  reactCompiler: true,
  reactStrictMode: true,

  images: {
    unoptimized: true,   // ⭐ Static export üçün ŞƏRTDİR
  },

  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
