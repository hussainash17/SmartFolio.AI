import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Container, Heading, Text, VStack, HStack, Flex, Box, Badge, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Table, Input } from "@chakra-ui/react"
import { FiPlus, FiSearch, FiChevronRight, FiBriefcase, FiTrendingUp, FiDollarSign, FiPercent } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { DialogRoot, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogActionTrigger, DialogCloseTrigger } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import useCustomToast from "@/hooks/useCustomToast"
import { PortfolioService } from "@/client"
import type { PortfolioCreate, PortfolioUpdate, PortfolioPublic, PortfolioPositionPublic } from "@/client"

const handleError = (error: any) => {
  console.error("Error:", error)
}

function EditPortfolioDialog({ portfolio }: { portfolio: PortfolioPublic }) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<PortfolioUpdate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { name: portfolio.name, description: portfolio.description, is_default: portfolio.is_default, is_active: portfolio.is_active },
  })
  const mutation = useMutation({
    mutationFn: (data: PortfolioUpdate) => PortfolioService.updatePortfolio({ portfolioId: portfolio.id, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Portfolio updated successfully.")
      reset()
      setIsOpen(false)
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] })
    },
  })
  const onSubmit: SubmitHandler<PortfolioUpdate> = (data) => mutation.mutate(data)
  return (
    <DialogRoot size={{ base: "xs", md: "md" }} placement="center" open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Portfolio</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4}>
              <Field required invalid={!!errors.name} errorText={errors.name?.message} label="Name">
                <Input id="name" {...register("name", { required: "Name is required." })} placeholder="Portfolio Name" type="text" />
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

function DeletePortfolioButton({ portfolioId }: { portfolioId: string }) {
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const mutation = useMutation({
    mutationFn: () => PortfolioService.deletePortfolio({ portfolioId }),
    onSuccess: () => {
      showSuccessToast("Portfolio deleted successfully.")
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] })
    },
  })
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this portfolio?")) {
      mutation.mutate()
    }
  }
  return (
    <Button variant="ghost" size="sm" colorScheme="red" onClick={handleDelete} loading={mutation.isPending}>Delete</Button>
  )
}

function AddPositionDialog({ portfolioId, portfolioName, onSuccess }: { portfolioId: string, portfolioName: string, onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<{ stock_symbol: string, quantity: number, average_price: number }>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { stock_symbol: "", quantity: 0, average_price: 0 },
  })
  
  // Custom function to handle the parameter mapping
  const addPositionWithSymbol = async (data: { stock_symbol: string, quantity: number, average_price: number }) => {
    // The backend now accepts stock symbols directly
    return PortfolioService.addPosition({
      portfolioId,
      stockSymbol: data.stock_symbol,
      quantity: data.quantity,
      averagePrice: data.average_price
    })
  }
  
  const mutation = useMutation({
    mutationFn: addPositionWithSymbol,
    onSuccess: () => {
      showSuccessToast("Position added successfully.")
      reset()
      setIsOpen(false)
      onSuccess()
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["positions", portfolioId] })
    },
  })
  const onSubmit: SubmitHandler<{ stock_symbol: string, quantity: number, average_price: number }> = (data) => mutation.mutate(data)
  return (
    <DialogRoot size={{ base: "xs", md: "md" }} placement="center" open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button size="sm" colorScheme="blue">
          <FiPlus />
          Add Position
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Position to {portfolioName}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4}>
              <Field required invalid={!!errors.stock_symbol} errorText={errors.stock_symbol?.message} label="Stock Symbol">
                <Input id="stock_symbol" {...register("stock_symbol", { required: "Stock symbol is required." })} placeholder="e.g., AAPL, GOOGL" type="text" />
              </Field>
              <Field required invalid={!!errors.quantity} errorText={errors.quantity?.message} label="Quantity">
                <Input id="quantity" {...register("quantity", { required: "Quantity is required.", valueAsNumber: true })} placeholder="Quantity" type="number" />
              </Field>
              <Field required invalid={!!errors.average_price} errorText={errors.average_price?.message} label="Average Price">
                <Input id="average_price" {...register("average_price", { required: "Average price is required.", valueAsNumber: true })} placeholder="Average Price" type="number" />
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

function EditPositionDialog({ position, portfolioId, onSuccess }: { position: PortfolioPositionPublic, portfolioId: string, onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<{ quantity: number, average_price: number }>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { quantity: position.quantity, average_price: Number(position.average_price) },
  })
  
  // Custom function to handle the parameter mapping
  const updatePositionWithCorrectParams = async (data: { quantity: number, average_price: number }) => {
    return PortfolioService.updatePosition({
      portfolioId,
      positionId: position.id,
      quantity: data.quantity,
      averagePrice: data.average_price
    })
  }
  
  const mutation = useMutation({
    mutationFn: updatePositionWithCorrectParams,
    onSuccess: () => {
      showSuccessToast("Position updated successfully.")
      reset()
      setIsOpen(false)
      onSuccess()
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["positions", portfolioId] })
    },
  })
  const onSubmit: SubmitHandler<{ quantity: number, average_price: number }> = (data) => mutation.mutate(data)
  return (
    <DialogRoot size={{ base: "xs", md: "md" }} placement="center" open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Position</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4}>
              <Field required invalid={!!errors.quantity} errorText={errors.quantity?.message} label="Quantity">
                <Input id="quantity" {...register("quantity", { required: "Quantity is required.", valueAsNumber: true })} placeholder="Quantity" type="number" />
              </Field>
              <Field required invalid={!!errors.average_price} errorText={errors.average_price?.message} label="Average Price">
                <Input id="average_price" {...register("average_price", { required: "Average price is required.", valueAsNumber: true })} placeholder="Average Price" type="number" />
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

function DeletePositionButton({ positionId, portfolioId, onSuccess }: { positionId: string, portfolioId: string, onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const mutation = useMutation({
    mutationFn: () => PortfolioService.removePosition({ portfolioId, positionId }),
    onSuccess: () => {
      showSuccessToast("Position removed successfully.")
      onSuccess()
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["positions", portfolioId] })
    },
  })
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to remove this position?")) {
      mutation.mutate()
    }
  }
  return (
    <Button variant="ghost" size="sm" colorScheme="red" onClick={handleDelete} loading={mutation.isPending}>Delete</Button>
  )
}

function PortfolioPositionsTable({ portfolioId, portfolioName }: { portfolioId: string, portfolioName: string }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["positions", portfolioId],
    queryFn: () => PortfolioService.getPortfolioPositions({ portfolioId }),
    enabled: !!portfolioId,
  })
  
  if (!portfolioId) return null
  
  return (
    <VStack align="start" w="full" mt={6}>
      <HStack justify="space-between" w="full" align="center">
        <VStack align="start" gap={1}>
          <Heading size="md">{portfolioName} - Positions</Heading>
          <Text color="gray.600" fontSize="sm">
            {data?.length || 0} position{data?.length !== 1 ? 's' : ''}
          </Text>
        </VStack>
        <AddPositionDialog portfolioId={portfolioId} portfolioName={portfolioName} onSuccess={refetch} />
      </HStack>
      
      {isLoading ? (
        <Box w="full" py={8} textAlign="center">
          <Text>Loading positions...</Text>
        </Box>
      ) : !data || data.length === 0 ? (
        <Box w="full" py={8} textAlign="center" bg="gray.50" borderRadius="md">
          <FiSearch size={32} color="#9CA3AF" />
          <Text fontWeight="bold" mt={2}>No positions in this portfolio yet</Text>
          <Text color="gray.600" fontSize="sm">Add your first position to get started</Text>
        </Box>
      ) : (
        <Box w="full" border="1px solid" borderColor="gray.200" borderRadius="lg" overflow="hidden">
          <Table.Root size={{ base: "sm", md: "md" }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Stock Symbol</Table.ColumnHeader>
                <Table.ColumnHeader>Quantity</Table.ColumnHeader>
                <Table.ColumnHeader>Avg Price</Table.ColumnHeader>
                <Table.ColumnHeader>Total Investment</Table.ColumnHeader>
                <Table.ColumnHeader>Current Value</Table.ColumnHeader>
                <Table.ColumnHeader>P&L</Table.ColumnHeader>
                <Table.ColumnHeader>Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.map((pos: PortfolioPositionPublic) => (
                <Table.Row key={pos.id}>
                  <Table.Cell>
                    <Text fontWeight="semibold">{pos.stock_id}</Text>
                  </Table.Cell>
                  <Table.Cell>{pos.quantity.toLocaleString()}</Table.Cell>
                  <Table.Cell>${Number(pos.average_price).toFixed(2)}</Table.Cell>
                  <Table.Cell>${Number(pos.total_investment).toFixed(2)}</Table.Cell>
                  <Table.Cell>${Number(pos.current_value).toFixed(2)}</Table.Cell>
                  <Table.Cell>
                    <HStack gap={1}>
                      <Text color={Number(pos.unrealized_pnl) >= 0 ? "green.600" : "red.600"} fontWeight="semibold">
                        ${Number(pos.unrealized_pnl).toFixed(2)}
                      </Text>
                      <Badge colorScheme={Number(pos.unrealized_pnl_percent) >= 0 ? "green" : "red"} size="sm">
                        {Number(pos.unrealized_pnl_percent).toFixed(2)}%
                      </Badge>
                    </HStack>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap={2}>
                      <EditPositionDialog position={pos} portfolioId={portfolioId} onSuccess={refetch} />
                      <DeletePositionButton positionId={pos.id} portfolioId={portfolioId} onSuccess={refetch} />
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </VStack>
  )
}

function AddPortfolioDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<PortfolioCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { name: "", description: "", is_default: false, is_active: true },
  })
  const mutation = useMutation({
    mutationFn: (data: PortfolioCreate) => PortfolioService.createPortfolio({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Portfolio created successfully.")
      reset()
      setIsOpen(false)
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] })
    },
  })
  const onSubmit: SubmitHandler<PortfolioCreate> = (data) => mutation.mutate(data)
  return (
    <DialogRoot size={{ base: "xs", md: "md" }} placement="center" open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button>
          <FiPlus />
          Create Portfolio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create New Portfolio</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4}>
              <Field required invalid={!!errors.name} errorText={errors.name?.message} label="Portfolio Name">
                <Input id="name" {...register("name", { required: "Name is required." })} placeholder="e.g., Growth Portfolio" type="text" />
              </Field>
              <Field invalid={!!errors.description} errorText={errors.description?.message} label="Description">
                <Input id="description" {...register("description")} placeholder="Brief description of your portfolio" type="text" />
              </Field>
            </VStack>
          </DialogBody>
          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button variant="subtle" colorPalette="gray" disabled={isSubmitting}>Cancel</Button>
            </DialogActionTrigger>
            <Button variant="solid" type="submit" disabled={!isValid} loading={isSubmitting}>Create Portfolio</Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

function PortfolioCard({ portfolio, isSelected, onSelect }: { portfolio: PortfolioPublic, isSelected: boolean, onSelect: (id: string) => void }) {
  return (
    <Box
      p={4}
      border="1px solid"
      borderColor={isSelected ? "blue.200" : "gray.200"}
      borderRadius="lg"
      bg={isSelected ? "blue.50" : "white"}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        borderColor: isSelected ? "blue.300" : "gray.300",
        transform: "translateY(-1px)",
        boxShadow: "md"
      }}
      onClick={() => onSelect(portfolio.id)}
    >
      <HStack justify="space-between" align="start">
        <VStack align="start" gap={1} flex={1}>
          <HStack gap={2} align="center">
            <FiBriefcase size={16} color={isSelected ? "#3B82F6" : "#6B7280"} />
            <Text fontWeight="semibold" fontSize="lg">{portfolio.name}</Text>
            {portfolio.is_default && (
              <Badge colorScheme="blue" size="sm">Default</Badge>
            )}
          </HStack>
          <Text color="gray.600" fontSize="sm" maxW="200px" isTruncated>
            {portfolio.description || "No description"}
          </Text>
          <Text color="gray.500" fontSize="xs">
            Created {new Date(portfolio.created_at).toLocaleDateString()}
          </Text>
        </VStack>
        <HStack gap={1}>
          <EditPortfolioDialog portfolio={portfolio} />
          <DeletePortfolioButton portfolioId={portfolio.id} />
        </HStack>
      </HStack>
    </Box>
  )
}

function PortfolioGrid({ portfolios, selectedPortfolioId, onSelect }: { portfolios: PortfolioPublic[], selectedPortfolioId: string | null, onSelect: (id: string) => void }) {
  if (!portfolios.length) {
    return (
      <VStack py={12} textAlign="center" w="full">
        <FiBriefcase size={48} color="#9CA3AF" />
        <Text fontWeight="bold" fontSize="lg">You don't have any portfolios yet</Text>
        <Text color="gray.600">Create your first portfolio to start managing your investments</Text>
      </VStack>
    )
  }
  
  return (
    <VStack align="start" w="full" gap={4}>
      <HStack justify="space-between" w="full" align="center">
        <VStack align="start" gap={1}>
          <Heading size="md">Your Portfolios</Heading>
          <Text color="gray.600" fontSize="sm">
            {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}
          </Text>
        </VStack>
        <AddPortfolioDialog />
      </HStack>
      
      <Box w="full">
        <Flex gap={4} flexWrap="wrap">
          {portfolios.map((portfolio) => (
            <Box key={portfolio.id} minW="300px" flex="1">
              <PortfolioCard
                portfolio={portfolio}
                isSelected={selectedPortfolioId === portfolio.id}
                onSelect={onSelect}
              />
            </Box>
          ))}
        </Flex>
      </Box>
    </VStack>
  )
}

function PortfolioPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => PortfolioService.getUserPortfolios(),
  })
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  
  const selectedPortfolio = data?.find(p => p.id === selectedPortfolioId)
  
  return (
    <Container maxW="full" py={6}>
      <VStack align="start" w="full" gap={6}>
        {/* Header */}
        <VStack align="start" w="full" gap={2}>
          <Heading size="lg">Portfolio Management</Heading>
          <Text color="gray.600">Manage your investment portfolios and track your positions</Text>
        </VStack>
        
        {/* Breadcrumbs */}
        {selectedPortfolio && (
          <Breadcrumb separator={<FiChevronRight />}>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => setSelectedPortfolioId(null)} cursor="pointer">
                Portfolios
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink>{selectedPortfolio.name}</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
        )}
        
        {/* Content */}
        {isLoading ? (
          <Box w="full" py={8} textAlign="center">
            <Text>Loading portfolios...</Text>
          </Box>
        ) : selectedPortfolio ? (
          <VStack align="start" w="full" gap={6}>
            {/* Portfolio Summary */}
            <Box w="full" p={6} bg="gray.50" borderRadius="lg" border="1px solid" borderColor="gray.200">
              <HStack justify="space-between" align="center">
                <VStack align="start" gap={1}>
                  <HStack gap={2} align="center">
                    <FiBriefcase size={20} />
                    <Heading size="md">{selectedPortfolio.name}</Heading>
                    {selectedPortfolio.is_default && (
                      <Badge colorScheme="blue">Default</Badge>
                    )}
                  </HStack>
                  <Text color="gray.600">{selectedPortfolio.description || "No description"}</Text>
                </VStack>
                <Button variant="ghost" onClick={() => setSelectedPortfolioId(null)}>
                  Back to Portfolios
                </Button>
              </HStack>
            </Box>
            
            {/* Positions */}
            <PortfolioPositionsTable portfolioId={selectedPortfolio.id} portfolioName={selectedPortfolio.name} />
          </VStack>
        ) : (
          <PortfolioGrid
            portfolios={data || []}
            selectedPortfolioId={selectedPortfolioId}
            onSelect={setSelectedPortfolioId}
          />
        )}
      </VStack>
    </Container>
  )
} 