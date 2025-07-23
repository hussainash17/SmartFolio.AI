import React, { useState } from "react"
import { Container, Heading, Table, Flex, Button, VStack, Text } from "@chakra-ui/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FiPlus, FiSearch } from "react-icons/fi"
import { WatchlistService } from "@/client"
import type { WatchlistCreate, WatchlistPublic, WatchlistUpdate, WatchlistItemPublic } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import { DialogRoot, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogActionTrigger, DialogCloseTrigger } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@chakra-ui/react"
import { type SubmitHandler, useForm } from "react-hook-form"

export const Route = createFileRoute("/_layout/watchlist")({
  component: WatchlistPage,
})

function EditWatchlistDialog({ watchlist }: { watchlist: WatchlistPublic }) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<WatchlistUpdate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { name: watchlist.name, description: watchlist.description || "", is_default: watchlist.is_default, is_active: watchlist.is_active },
  })
  const mutation = useMutation({
    mutationFn: (data: WatchlistUpdate) => WatchlistService.updateWatchlist({ watchlistId: watchlist.id, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Watchlist updated successfully.")
      reset()
      setIsOpen(false)
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] })
    },
  })
  const onSubmit: SubmitHandler<WatchlistUpdate> = (data) => mutation.mutate(data)
  return (
    <DialogRoot size={{ base: "xs", md: "md" }} placement="center" open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Watchlist</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4}>
              <Field required invalid={!!errors.name} errorText={errors.name?.message} label="Name">
                <Input id="name" {...register("name", { required: "Name is required." })} placeholder="Watchlist Name" type="text" />
              </Field>
              <Field invalid={!!errors.description} errorText={errors.description?.message} label="Description">
                <Input id="description" {...register("description")} placeholder="Description" type="text" />
              </Field>
            </VStack>
          </DialogBody>
          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button variant="subtle" colorPalette="gray" disabled={isSubmitting}>Cancel</Button>
            </DialogActionTrigger>
            <Button variant="solid" type="submit" disabled={!isValid} loading={isSubmitting}>Save</Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

function DeleteWatchlistButton({ watchlistId }: { watchlistId: string }) {
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const mutation = useMutation({
    mutationFn: () => WatchlistService.deleteWatchlist({ watchlistId }),
    onSuccess: () => {
      showSuccessToast("Watchlist deleted successfully.")
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] })
    },
  })
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this watchlist?")) {
      mutation.mutate()
    }
  }
  return (
    <Button variant="ghost" size="sm" colorScheme="red" onClick={handleDelete} loading={mutation.isPending}>Delete</Button>
  )
}

function AddWatchlistItemDialog({ watchlistId, onSuccess }: { watchlistId: string, onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<{ stock_id: string, notes?: string }>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { stock_id: "", notes: "" },
  })
  const mutation = useMutation({
    mutationFn: (data: { stock_id: string, notes?: string }) =>
      WatchlistService.addWatchlistItem({ watchlistId, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Stock added to watchlist successfully.")
      reset()
      setIsOpen(false)
      onSuccess()
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist-items", watchlistId] })
    },
  })
  const onSubmit: SubmitHandler<{ stock_id: string, notes?: string }> = (data) => mutation.mutate(data)
  return (
    <DialogRoot size={{ base: "xs", md: "md" }} placement="center" open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button my={2} size="sm">
          <FiPlus />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Stock to Watchlist</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4}>
              <Field required invalid={!!errors.stock_id} errorText={errors.stock_id?.message} label="Stock ID">
                <Input id="stock_id" {...register("stock_id", { required: "Stock ID is required." })} placeholder="Stock ID" type="text" />
              </Field>
              <Field invalid={!!errors.notes} errorText={errors.notes?.message} label="Notes">
                <Input id="notes" {...register("notes")} placeholder="Notes (optional)" type="text" />
              </Field>
            </VStack>
          </DialogBody>
          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button variant="subtle" colorPalette="gray" disabled={isSubmitting}>Cancel</Button>
            </DialogActionTrigger>
            <Button variant="solid" type="submit" disabled={!isValid} loading={isSubmitting}>Save</Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

function EditWatchlistItemDialog({ item, watchlistId, onSuccess }: { item: WatchlistItemPublic, watchlistId: string, onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<{ notes?: string }>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { notes: item.notes || "" },
  })
  const mutation = useMutation({
    mutationFn: (data: { notes?: string }) =>
      WatchlistService.updateWatchlistItem({ watchlistId, itemId: item.id, ...data }),
    onSuccess: () => {
      showSuccessToast("Watchlist item updated successfully.")
      reset()
      setIsOpen(false)
      onSuccess()
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist-items", watchlistId] })
    },
  })
  const onSubmit: SubmitHandler<{ notes?: string }> = (data) => mutation.mutate(data)
  return (
    <DialogRoot size={{ base: "xs", md: "md" }} placement="center" open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Watchlist Item</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4}>
              <Field invalid={!!errors.notes} errorText={errors.notes?.message} label="Notes">
                <Input id="notes" {...register("notes")} placeholder="Notes (optional)" type="text" />
              </Field>
            </VStack>
          </DialogBody>
          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button variant="subtle" colorPalette="gray" disabled={isSubmitting}>Cancel</Button>
            </DialogActionTrigger>
            <Button variant="solid" type="submit" disabled={!isValid} loading={isSubmitting}>Save</Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

function DeleteWatchlistItemButton({ itemId, watchlistId, onSuccess }: { itemId: string, watchlistId: string, onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const mutation = useMutation({
    mutationFn: () => WatchlistService.removeWatchlistItem({ watchlistId, itemId }),
    onSuccess: () => {
      showSuccessToast("Stock removed from watchlist successfully.")
      onSuccess()
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist-items", watchlistId] })
    },
  })
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to remove this stock from the watchlist?")) {
      mutation.mutate()
    }
  }
  return (
    <Button variant="ghost" size="sm" colorScheme="red" onClick={handleDelete} loading={mutation.isPending}>Delete</Button>
  )
}

function WatchlistItemsTable({ watchlistId }: { watchlistId: string }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["watchlist-items", watchlistId],
    queryFn: () => WatchlistService.getWatchlistItems({ watchlistId }),
    enabled: !!watchlistId,
  })
  if (!watchlistId) return null
  return (
    <VStack align="start" w="full" mt={6}>
      <Heading size="md">Stocks</Heading>
      <AddWatchlistItemDialog watchlistId={watchlistId} onSuccess={refetch} />
      {isLoading ? (
        <Text>Loading stocks...</Text>
      ) : !data || data.length === 0 ? (
        <Text>No stocks in this watchlist yet.</Text>
      ) : (
        <Table.Root size={{ base: "sm", md: "md" }}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Stock ID</Table.ColumnHeader>
              <Table.ColumnHeader>Added At</Table.ColumnHeader>
              <Table.ColumnHeader>Notes</Table.ColumnHeader>
              <Table.ColumnHeader>Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.map((item: WatchlistItemPublic) => (
              <Table.Row key={item.id}>
                <Table.Cell>{item.stock_id}</Table.Cell>
                <Table.Cell>{new Date(item.added_at).toLocaleDateString()}</Table.Cell>
                <Table.Cell>{item.notes || "N/A"}</Table.Cell>
                <Table.Cell>
                  <Flex gap={2}>
                    <EditWatchlistItemDialog item={item} watchlistId={watchlistId} onSuccess={refetch} />
                    <DeleteWatchlistItemButton itemId={item.id} watchlistId={watchlistId} onSuccess={refetch} />
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </VStack>
  )
}

function AddWatchlistDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<WatchlistCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { name: "", description: "", is_default: false, is_active: true },
  })
  const mutation = useMutation({
    mutationFn: (data: WatchlistCreate) => WatchlistService.createWatchlist({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Watchlist created successfully.")
      reset()
      setIsOpen(false)
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] })
    },
  })
  const onSubmit: SubmitHandler<WatchlistCreate> = (data) => mutation.mutate(data)
  return (
    <DialogRoot size={{ base: "xs", md: "md" }} placement="center" open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button my={4}>
          <FiPlus />
          Add Watchlist
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Watchlist</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4}>
              <Field required invalid={!!errors.name} errorText={errors.name?.message} label="Name">
                <Input id="name" {...register("name", { required: "Name is required." })} placeholder="Watchlist Name" type="text" />
              </Field>
              <Field invalid={!!errors.description} errorText={errors.description?.message} label="Description">
                <Input id="description" {...register("description")} placeholder="Description" type="text" />
              </Field>
            </VStack>
          </DialogBody>
          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button variant="subtle" colorPalette="gray" disabled={isSubmitting}>Cancel</Button>
            </DialogActionTrigger>
            <Button variant="solid" type="submit" disabled={!isValid} loading={isSubmitting}>Save</Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

function WatchlistPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["watchlists"],
    queryFn: () => WatchlistService.getUserWatchlists(),
  })
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(null)
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>Watchlist Management</Heading>
      <AddWatchlistDialog />
      {isLoading ? <Text>Loading...</Text> : <WatchlistTable watchlists={data || []} onSelect={setSelectedWatchlistId} />}
      {selectedWatchlistId && <WatchlistItemsTable watchlistId={selectedWatchlistId} />}
    </Container>
  )
}

function WatchlistTable({ watchlists, onSelect }: { watchlists: WatchlistPublic[], onSelect: (id: string) => void }) {
  if (!watchlists.length) {
    return (
      <VStack py={8} textAlign="center" w="full">
        <FiSearch size={32} />
        <Text fontWeight="bold">You don't have any watchlists yet</Text>
        <Text>Add a new watchlist to get started</Text>
      </VStack>
    )
  }
  return (
    <Table.Root size={{ base: "sm", md: "md" }}>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader w="sm">Name</Table.ColumnHeader>
          <Table.ColumnHeader w="sm">Description</Table.ColumnHeader>
          <Table.ColumnHeader w="sm">Actions</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {watchlists.map((watchlist) => (
          <Table.Row key={watchlist.id} onClick={() => onSelect(watchlist.id)} style={{ cursor: "pointer" }}>
            <Table.Cell>{watchlist.name}</Table.Cell>
            <Table.Cell>{watchlist.description || "N/A"}</Table.Cell>
            <Table.Cell>
              <Flex gap={2}>
                <EditWatchlistDialog watchlist={watchlist} />
                <DeleteWatchlistButton watchlistId={watchlist.id} />
              </Flex>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
} 