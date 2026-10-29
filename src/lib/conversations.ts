import { queryOptions, useMutation, useQuery } from "@tanstack/react-query"

import {
  deleteConversation,
  listConversations,
  renameConversation,
  type ConversationSummary,
  type ServerEvent,
} from "@/lib/api"
import { syncAllChats, syncChatById } from "@/lib/chat"
import { queryClient } from "@/lib/query-client"

const conversationsQuery = queryOptions({
  queryKey: ["conversations"],
  queryFn: listConversations,
})

export function useConversations() {
  return useQuery(conversationsQuery)
}

// Apply a change to the cached list right away and roll it back if the
// request fails. The server's "conversations-changed" event refetches anyway.
function useListMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<void>,
  update: (
    list: ConversationSummary[],
    variables: TVariables
  ) => ConversationSummary[]
) {
  const { queryKey } = conversationsQuery
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (list) =>
        list ? update(list, variables) : list
      )
      return { previous }
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}

export function useRenameConversation() {
  return useListMutation(
    ({ id, title }: { id: string; title: string }) =>
      renameConversation(id, title),
    (list, { id, title }) =>
      list.map((chat) => (chat.id === id ? { ...chat, title } : chat))
  )
}

export function useDeleteConversation() {
  return useListMutation(
    (id: string) => deleteConversation(id),
    (list, id) => list.filter((chat) => chat.id !== id)
  )
}

function refetchConversations() {
  void queryClient.invalidateQueries({ queryKey: conversationsQuery.queryKey })
}

/**
 * Keeps every open device in sync: the server announces runs and list
 * changes, and we refetch whatever is affected.
 */
export function connectServerEvents() {
  const source = new EventSource("/api/events")

  // Also fires after a reconnect, where we may have missed events.
  source.addEventListener("open", () => {
    refetchConversations()
    syncAllChats()
  })

  source.addEventListener("message", (message: MessageEvent<string>) => {
    const event = JSON.parse(message.data) as ServerEvent
    if (event.type === "conversations-changed") {
      refetchConversations()
    } else {
      syncChatById(event.conversationId)
    }
  })
}
