import { db } from "@/db";
import getPineconeClient from "@/lib/pinecone";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import { pipeline } from '@xenova/transformers';
import { updateVectorDB } from "@/lib/utils";
const f = createUploadthing();



export const ourFileRouter = {
  imageUploader: f({
    pdf: {
  
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
        const { getUser } = getKindeServerSession()
        const user =await getUser()
      
        if (!user || !user.id) throw new Error('Unauthorized')
   return {user,userId:user.id}
    })
    .onUploadComplete(async ({ metadata, file }) => {
        const isFileExist = await db.file.findFirst({
            where: {
              key: file.key,
            },
          })
        
          if (isFileExist) return
       
          const createdFile = await db.file.create({
            data: {
              key: file.key,
              name: file.name,
              userId: metadata.userId,
              url: file.ufsUrl,
              uploadStatus: 'PROCESSING',
            },
          })

          try {
            const response = await fetch(
              createdFile.url
            )
        
            const blob = await response.blob()
        
            const loader = new PDFLoader(blob,{
              splitPages:false
            })
        
            const pageLevelDocs = await loader.load()
        
            const pagesAmt = pageLevelDocs.length
            const texts = pageLevelDocs.map(doc => doc.pageContent);
            // const { subscriptionPlan } = metadata
            // const { isSubscribed } = subscriptionPlan
        
            // const isProExceeded =
            //   pagesAmt >
            //   PLANS.find((plan) => plan.name === 'Pro')!.pagesPerPdf
            // const isFreeExceeded =
            //   pagesAmt >
            //   PLANS.find((plan) => plan.name === 'Free')!
            //     .pagesPerPdf
        
            // if (
            //   (isSubscribed && isProExceeded) ||
            //   (!isSubscribed && isFreeExceeded)
            // ) {
            //   await db.file.update({
            //     data: {
            //       uploadStatus: 'FAILED',
            //     },
            //     where: {
            //       id: createdFile.id,
            //     },
            //   })
            // }
        
            const pinecone = await getPineconeClient()
            const pineconeIndex = pinecone.Index('quill')
            updateVectorDB(pinecone,"quill",createdFile.id,pageLevelDocs)
    
      
            await db.file.update({
              data: {
                uploadStatus: 'SUCCESS',
              },
              where: {
                id: createdFile.id,
              },
            })
          } catch (err:any) {
            console.error("Error submitting questions:", err?.message || err);
            await db.file.update({
              data: {
                uploadStatus: 'FAILED',
              },
              where: {
                id: createdFile.id,
              },
            })
          }
          

    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;