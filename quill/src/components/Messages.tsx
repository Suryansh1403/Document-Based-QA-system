import { Message as MessageType } from "@prisma/client"
import { useInfiniteQuery } from "@tanstack/react-query"
import Message from "./message"

const Messages=  ({fileId}:{fileId:string})=>{

    const fetchMessages = async ({ pageParam = 0 }) => {
        const res = await fetch('/api/message?cursor=' + pageParam+'&fileId='+fileId)
        return res.json()
      }
    
      const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        status,
      } = useInfiniteQuery({
        queryKey: [`messages:${fileId}`],
        queryFn: fetchMessages,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam:-1
      })
      console.log(data)
const action = ()=>{

fetchNextPage()
}
return <>

{status === 'pending' && <div>Loading...</div>}
    {status === 'error' && <div>Error: {error.message}</div>}
    <div className='flex max-h-[calc(100vh-3.5rem-7rem)] border-zinc-200 flex-1 flex-col-reverse gap-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch'>
    {data?.pages?.map((page: { messages: MessageType[] }) => (
  <div key={page.messages[0]?.id || 'page'}> {/* Add a unique key for each page */}
    {page.messages.map((message: MessageType) => (
      <Message isNextMessageSamePerson={false} key={message.id} message={message}/>
    ))}
  </div>
))}

    {isFetchingNextPage && <div>Loading more messages...</div>}
</div>
</>
}

export default Messages