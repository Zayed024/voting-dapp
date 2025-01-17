// next.config.mjs
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: [
      "anchor/target/idl/votingdapp.json",
    ],
  },
};

export default nextConfig;
