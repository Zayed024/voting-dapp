// next.config.mjs
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "anchor/target/idl/voting.json": true,
    },
  },
};

export default nextConfig;
