import { Document } from "@langchain/core/documents"
import { Pinecone, PineconeRecord, RecordMetadata } from "@pinecone-database/pinecone"
import { FeatureExtractionPipeline, pipeline } from "@huggingface/transformers";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function absoluteUrl(path: string) {
  if (typeof window !== 'undefined') return path
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}${path}`
  return `http://localhost:${
    process.env.PORT ?? 3000
  }${path}`
}



export async function updateVectorDB(
  client: Pinecone,
  indexname: string,
  namespace: string,
  docs: Document[],
) {
  // let callback = progressCallback;
  let totalDocumentChunks = 0;
  let totalDocumentChunksUpseted = 0;
  const modelname = 'Xenova/all-MiniLM-L6-v2';
  const extractor = await pipeline('feature-extraction', modelname);
  
  for(const doc of docs){
      await processDocument(client, indexname, namespace, doc, extractor)
  }

}


async function processDocument(client: Pinecone, indexname: string, namespace: string, doc: Document<Record<string, any>>, extractor: FeatureExtractionPipeline) {
  const splitter = new RecursiveCharacterTextSplitter();
  const documentChunks = await splitter.splitText(doc.pageContent);
  let totalDocumentChunks = documentChunks.length;
  let totalDocumentChunksUpseted = 0;
  const filename = getFilename(doc.metadata.source);
  
  console.log(documentChunks.length);
  let chunkBatchIndex = 0;
  while(documentChunks.length > 0){
      chunkBatchIndex++;
      const chunkBatch = documentChunks.splice(0,10)
      await processOneBatch(client, indexname, namespace, extractor, chunkBatch, chunkBatchIndex, filename)
  }
}

function getFilename(filename: string): string {
    const docname = filename.substring(filename.lastIndexOf("/") + 1);
    return docname.substring(0, docname.lastIndexOf(".")) || docname;
  }

  async function processOneBatch(client: Pinecone, indexname: string, namespace: string, extractor: FeatureExtractionPipeline, chunkBatch: string[], chunkBatchIndex: number, filename: string) {
    const output = await extractor(chunkBatch.map(str => str.replace(/\n/g, ' ')), {
        pooling: 'cls'
    });
    const embeddingsBatch = output.tolist();
    let vectorBatch: PineconeRecord<RecordMetadata>[] = [];
    for(let i=0; i <chunkBatch.length; i++){
        const chunk = chunkBatch[i];
        const embedding = embeddingsBatch[i];

        const vector: PineconeRecord<RecordMetadata> = {
            id: `${filename}-${chunkBatchIndex}-${i}`,
            values: embedding,
            metadata: {
                chunk
            }
        }
        vectorBatch.push(vector);
    }

    const index = client.Index(indexname).namespace(namespace);
    await index.upsert(vectorBatch);
    let totalDocumentChunksUpseted  = 0;
    totalDocumentChunksUpseted  = totalDocumentChunksUpseted + vectorBatch.length;
   
    vectorBatch = [];
}