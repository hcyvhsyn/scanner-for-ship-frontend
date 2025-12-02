/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",          // ⭐ STATIC EXPORT aktiv
  trailingSlash: true,       // ⭐ serverdə routing problemlərinin qarşısını alır
  reactCompiler: true,
  reactStrictMode: true,

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
