import {
    ReactNode,
    createContext,
    useRef,
    useState,
  } from 'react'
  import {toast} from "sonner"
  import { useMutation, useQueryClient } from '@tanstack/react-query'
//   import { INFINITE_QUERY_LIMIT } from '@/config/infinite-query'
  import { trpc } from '@/trpc/client'
import { getQueryClient } from '@trpc/react-query/shared'
  type StreamResponse = {
    addMessage: () => void
    message: string
    handleInputChange: (
      event: React.ChangeEvent<HTMLTextAreaElement>
    ) => void
    isLoading: boolean
  }
  
  export const ChatContext = createContext<StreamResponse>({
    addMessage: () => {},
    message: '',
    handleInputChange: () => {},
    isLoading: false,
  })
  
  interface Props {
    fileId: string
    children: ReactNode
  }
  
  export const ChatContextProvider = ({
    fileId,
    children,
  }: Props) => {
    const [message, setMessage] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)
  const [generatedText,setGeneratedText] = useState<string>('')
  const queryClient = useQueryClient()
    const utils = trpc.useContext()
  
  
    const backupMessage = useRef('')
  
    const { mutate: sendMessage } = useMutation({
      mutationFn: async ({
        message,
      }: {
        message: string
      }) => {
        const response = await fetch('/api/message', {
          method: 'POST',
          body: JSON.stringify({
            fileId,
            message,
          }),
        })
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
    
          while (true) {
            const { done, value } = await reader.read();
    
            if (done) {
              break;
            }
    
            const chunk = decoder.decode(value, { stream: true });
            setGeneratedText((prev) => prev + chunk);
          }
        }
    
        if (!response.ok) {
          throw new Error('Failed to send message')
        }
  
        return response.body
      },
      onMutate: async ({message}) => {
        // Cancel any ongoing refetches to avoid overwriting the optimistic update
        await queryClient.cancelQueries({ queryKey: [`messages:${fileId}`] });
  
        // Snapshot the previous value
        const previousMessages = queryClient.getQueryData([`messages:${fileId}`]);
  
        // Optimistically update the UI
        queryClient.setQueryData([`messages:${fileId}`], (old: any) => {
          const newMessage = { id: crypto.randomUUID(),isUserMessage:true, text:message, createdAt: new Date().toISOString() };
          return {
            pages: [
              {
                messages: [ ...(old.pages[0]?.messages || []),newMessage],
                nextCursor: old.pages[0]?.nextCursor,
              },
              ...old.pages.slice(1),
            ],
            pageParams: old.pageParams,
          };
        });
        return {previousMessages}
    },
    onError: (err, text, context) => {
    
      queryClient.setQueryData([`messages:${fileId}`], context?.previousMessages);
    },
    onSettled: () => {
    
      queryClient.invalidateQueries({ queryKey: [`messages:${fileId}`] });
      setMessage('')
    },

  })
  
    const handleInputChange = (
      e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      setMessage(e.target.value)
    }
  
    const addMessage = () => sendMessage({ message })
  
    return (
      <ChatContext.Provider
        value={{
          addMessage,
          message,
          handleInputChange,
          isLoading,
        }}>
        {children}
      </ChatContext.Provider>
    )
  }