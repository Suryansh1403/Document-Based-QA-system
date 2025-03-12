import { db } from '@/db'

import getPineconeClient from '@/lib/pinecone'
import { SendMessageValidator } from '@/lib/sendMessageValidator'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { PineconeStore } from '@langchain/pinecone';
import { NextRequest, NextResponse } from 'next/server'
import { EmbeddingsInterface } from '@langchain/core/embeddings'
import { pipeline,FeatureExtractionPipeline } from '@huggingface/transformers'

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genai = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
const model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });
export const POST = async (req: NextRequest) => {


  const body = await req.json()

  const { getUser } = getKindeServerSession()
  const user = await getUser()

  const { id: userId } = user

  if (!userId)
    return new Response('Unauthorized', { status: 401 })

  const { fileId, message } =
    SendMessageValidator.parse(body)

  const file = await db.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  })

  if (!file)
    return new Response('Not found', { status: 404 })

  await db.message.create({
    data: {
      text: message,
      isUserMessage: true,
      userId,
      fileId,
    },
  })
 const modelname = 'Xenova/all-MiniLM-L6-v2';
  const extractor : FeatureExtractionPipeline = await pipeline('feature-extraction', modelname);


  const pinecone = await getPineconeClient()
  const pineconeIndex = pinecone.Index('quill')

  interface Embedder {
    embed(text: string): Promise<number[]>;
  }
  

  class CustomEmbedder implements EmbeddingsInterface {
    private extractor: FeatureExtractionPipeline;
  
    constructor(extractor: FeatureExtractionPipeline) {
      this.extractor = extractor;
    }
      embedDocuments(documents: string[]): Promise<number[][]> {
          throw new Error('Method not implemented.')
      }
      async embedQuery(document: string): Promise<number[]> {
        const embeddings = await this.extractor(document, { pooling: 'mean', normalize: true });
        return embeddings.tolist();
      }
  

  }
  
  // Create the custom embedder
  const customEmbedder = new CustomEmbedder(extractor);
  const vectorStore = await PineconeStore.fromExistingIndex(
    customEmbedder,
    {
      pineconeIndex,
      namespace: file.id,
    }
  )

  const results = await vectorStore.similaritySearch(
    message,
    4
  )

  const prevMessages = await db.message.findMany({
    where: {
      fileId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 6,
  })

  const formattedPrevMessages = prevMessages.map((msg) => ({
    role: msg.isUserMessage
      ? ('user' as const)
      : ('assistant' as const),
    content: msg.text,
  }))

  const prompt = {

  
    messages: [
      {
        role: 'system',
        content:
          'Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.',
      },
      {
        role: 'user',
        content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
        
  \n----------------\n
  
  PREVIOUS CONVERSATION:
  ${formattedPrevMessages.map((message) => {
    if (message.role === 'user')
      return `User: ${message.content}\n`
    return `Assistant: ${message.content}\n`
  })}
  
  \n----------------\n
  
  CONTEXT:
  ${results.map((r) => r.metadata.chunk).join('\n\n')}
  
  USER INPUT: ${message}`,
      },
    ],
  
  }

 
  
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
  
        try {
          // Generate content using the Gemini API
          const result = await model.generateContent(JSON.stringify(prompt));
      
          const text = result.response.candidates[0].content.parts[0].text
  
          // Split the text into chunks (for demonstration purposes)
          const chunkSize = 20; // Adjust chunk size as needed
          for (let i = 0; i < text.length; i += chunkSize) {
            const chunk = text.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(chunk));
            await new Promise((resolve) => setTimeout(resolve,200)); // Simulate delay
          }

          await db.message.create({
            data:{
              text,
              isUserMessage:false,
              fileId,
              userId
            }
          })
  
          controller.close();
        } catch (error) {
          console.error('Error generating content with Gemini:', error);
          controller.error(error);
        }
      },
    });
  
    
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }



  export const GET = async (req: NextRequest) => {

const cursor = req.nextUrl.searchParams.get("cursor") 
const fileId = req.nextUrl.searchParams.get("fileId")
const { getUser } = getKindeServerSession()
const user = await getUser()

const { id: userId } = user
const file = await db.file.findFirst({
  where: {
    id: fileId!,
    userId,
  },
})

if (!file)
  return new Response('Not found', { status: 404 })

const messages = await db.message.findMany({
  where:{
    fileId
  },
  take: 5, 
  cursor: cursor? cursor != '-1'  ? { id: cursor } : undefined:undefined, 
  orderBy: { createdAt: 'desc' },

})


const nextCursor = messages.length >= 5 ? messages[messages.length -1].id : null;
messages.reverse()

return NextResponse.json({messages,nextCursor})
}
