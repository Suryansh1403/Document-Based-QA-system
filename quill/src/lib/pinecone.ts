import { Pinecone } from '@pinecone-database/pinecone';

async function getPineconeClient(){


const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
  
  
});
return pc
}

export default getPineconeClient


