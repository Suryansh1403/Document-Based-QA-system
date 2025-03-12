import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', 
 experimental: {
    turbo: {
        resolveAlias: {
          canvas: './empty-module.ts',
     },
     },
    },
    serverExternalPackages: ['sharp', 'onnxruntime-node'],
  
   
};

export default nextConfig;
