'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'


import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'
import { DialogTitle } from '@radix-ui/react-dialog'
import { UploadButton as UploadThingUploadButton } from '@/lib/uploadthing'


const UploadButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const router = useRouter()
  const { mutate: startPolling } = trpc.getFile.useMutation(
    {
      onSuccess: (file) => {
        router.push(`/dashboard/${file.id}`)
      },
      retry: true,
      retryDelay: 500,
    }
  )
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) {
          setIsOpen(v)
        }
      }}>
      <DialogTrigger
        onClick={() => setIsOpen(true)}
        asChild>
        <Button>Upload PDF</Button>
      </DialogTrigger>
<DialogTitle></DialogTitle>
      <DialogContent>
        <UploadThingUploadButton
        endpoint="imageUploader"
        
        onClientUploadComplete={(res) => {
       startPolling({key:res[0].key})
          alert("Upload Completed");
      
        }}
        onUploadError={(error: Error) => {
     
          alert(`ERROR! ${error.message}`);
        }}
      />
      </DialogContent>
    </Dialog>
  )
}

export default UploadButton