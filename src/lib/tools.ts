import { queryOptions, useMutation, useQuery } from "@tanstack/react-query"

import { listTools, setToolEnabled } from "@/lib/api"
import { queryClient } from "@/lib/query-client"

const toolsQuery = queryOptions({ queryKey: ["tools"], queryFn: listTools })

export function useTools() {
  return useQuery(toolsQuery)
}

// Flips the checkbox right away and rolls back if the request fails.
export function useSetToolEnabled() {
  const { queryKey } = toolsQuery
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      setToolEnabled(id, enabled),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (tools) =>
        tools?.map((tool) => (tool.id === id ? { ...tool, enabled } : tool))
      )
      return { previous }
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
