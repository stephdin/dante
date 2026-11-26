import { queryOptions, useMutation, useQuery } from "@tanstack/react-query"

import { getSystemPrompt, resetSystemPrompt, saveSystemPrompt } from "@/lib/api"
import { queryClient } from "@/lib/query-client"

const systemPromptQuery = queryOptions({
  queryKey: ["system-prompt"],
  queryFn: getSystemPrompt,
})

export function useSystemPrompt() {
  return useQuery(systemPromptQuery)
}

// The server answers with the new state, which goes straight into the cache.
const onSuccess = (data: Awaited<ReturnType<typeof getSystemPrompt>>) =>
  queryClient.setQueryData(systemPromptQuery.queryKey, data)

export function useSaveSystemPrompt() {
  return useMutation({ mutationFn: saveSystemPrompt, onSuccess })
}

export function useResetSystemPrompt() {
  return useMutation({ mutationFn: resetSystemPrompt, onSuccess })
}
