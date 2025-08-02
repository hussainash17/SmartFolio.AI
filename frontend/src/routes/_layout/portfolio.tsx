import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Container, Heading, Text, VStack, HStack, Flex, Box, Badge, Table, Input, IconButton, Grid, GridItem } from "@chakra-ui/react"
import { FiPlus, FiBriefcase, FiX, FiUpload, FiSave, FiStar, FiSettings, FiDownload } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogCloseTrigger } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import useCustomToast from "@/hooks/useCustomToast"
import { PortfolioService } from "@/client"
import type { PortfolioCreate, PortfolioPublic } from "@/client"
import { createFileRoute } from "@tanstack/react-router"

const handleError = (error: any) => {
  console.error("Error:", error)
}

// Portfolio Overview Stats Component
function PortfolioOverviewStats({ portfolioId: _portfolioId }: { portfolioId?: string }) {
  // Mock data for Bangladeshi market
  const stats = {
    totalValue: 1250000, // BDT
    totalPnL: 85000,
    totalPnLPercent: 7.28,
    dailyPnL: 12500,
    dailyPnLPercent: 1.01,
    cashBalance: 150000,
    positionsCount: 8,
    successRate: 78.5,
    avgReturn: 12.3,
    dividendYield: 2.4,
    annualDividend: 30000,
    beta: 1.09,
    volatility: "Low"
  }

  return (
    <Grid templateColumns="repeat(auto-fit, minmax(180px, 1fr))" gap={3} w="full">
      <GridItem>
        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
          <Text fontSize="xs" color="gray.600" mb={1}>Total Portfolio Value</Text>
          <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={1}>৳{stats.totalValue.toLocaleString()}</Text>
          <HStack gap={1}>
            <Text fontSize="xs" color={stats.totalPnL >= 0 ? "green.500" : "red.500"}>
              {stats.totalPnL >= 0 ? "↗" : "↘"} ৳{stats.totalPnL.toLocaleString()} ({stats.totalPnLPercent}%)
            </Text>
          </HStack>
        </Box>
      </GridItem>
      
      <GridItem>
        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
          <Text fontSize="xs" color="gray.600" mb={1}>Today's P&L</Text>
          <Text fontSize="xl" fontWeight="bold" color={stats.dailyPnL >= 0 ? "green.500" : "red.500"} mb={1}>
            {stats.dailyPnL >= 0 ? "+" : ""}৳{stats.dailyPnL.toLocaleString()}
          </Text>
          <HStack gap={1}>
            <Text fontSize="xs" color={stats.dailyPnL >= 0 ? "green.500" : "red.500"}>
              {stats.dailyPnL >= 0 ? "↗" : "↘"} {stats.dailyPnLPercent}%
            </Text>
          </HStack>
        </Box>
      </GridItem>
      
      <GridItem>
        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
          <Text fontSize="xs" color="gray.600" mb={1}>Cash Balance</Text>
          <Text fontSize="xl" fontWeight="bold" color="blue.500" mb={1}>৳{stats.cashBalance.toLocaleString()}</Text>
          <Text fontSize="xs" color="gray.500">Available for trading</Text>
        </Box>
      </GridItem>
      
      <GridItem>
        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
          <Text fontSize="xs" color="gray.600" mb={1}>Active Positions</Text>
          <Text fontSize="xl" fontWeight="bold" color="purple.500" mb={1}>{stats.positionsCount}</Text>
          <Text fontSize="xs" color="gray.500">Stocks in portfolio</Text>
        </Box>
      </GridItem>

      <GridItem>
        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
          <Text fontSize="xs" color="gray.600" mb={1}>Dividend Yield</Text>
          <Text fontSize="xl" fontWeight="bold" color="green.500" mb={1}>{stats.dividendYield}%</Text>
          <Text fontSize="xs" color="gray.500">৳{stats.annualDividend.toLocaleString()}/year</Text>
        </Box>
      </GridItem>

      <GridItem>
        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
          <Text fontSize="xs" color="gray.600" mb={1}>Risk (Beta)</Text>
          <Text fontSize="xl" fontWeight="bold" color="orange.500" mb={1}>{stats.beta}</Text>
          <Text fontSize="xs" color="gray.500">{stats.volatility} volatility</Text>
        </Box>
      </GridItem>
    </Grid>
  )
}

// Asset Allocation Component
function AssetAllocation({ portfolioId: _portfolioId }: { portfolioId?: string }) {
  const allocation = {
    stocks: 85,
    bonds: 10,
    cash: 5,
    sectors: [
      { name: "Banking", percentage: 35, color: "blue.500" },
      { name: "Telecom", percentage: 25, color: "green.500" },
      { name: "Energy", percentage: 20, color: "orange.500" },
      { name: "Others", percentage: 20, color: "purple.500" }
    ]
  }

  return (
    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
      <HStack justify="space-between" mb={3}>
        <Heading size="sm">Asset Allocation</Heading>
        <Text fontSize="xs" color="blue.500" cursor="pointer">View Details &gt;</Text>
      </HStack>
      
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
        <VStack align="start" gap={3}>
          <Text fontWeight="semibold" fontSize="sm">Asset Classes</Text>
          <VStack align="start" gap={2} w="full">
            <HStack justify="space-between" w="full">
              <HStack gap={2}>
                <Box w={3} h={3} bg="blue.500" borderRadius="sm" />
                <Text fontSize="sm">Stocks</Text>
              </HStack>
              <Text fontSize="sm" fontWeight="semibold">{allocation.stocks}%</Text>
            </HStack>
            <HStack justify="space-between" w="full">
              <HStack gap={2}>
                <Box w={3} h={3} bg="green.500" borderRadius="sm" />
                <Text fontSize="sm">Bonds</Text>
              </HStack>
              <Text fontSize="sm" fontWeight="semibold">{allocation.bonds}%</Text>
            </HStack>
            <HStack justify="space-between" w="full">
              <HStack gap={2}>
                <Box w={3} h={3} bg="orange.500" borderRadius="sm" />
                <Text fontSize="sm">Cash</Text>
              </HStack>
              <Text fontSize="sm" fontWeight="semibold">{allocation.cash}%</Text>
            </HStack>
          </VStack>
        </VStack>
        
        <VStack align="start" gap={3}>
          <Text fontWeight="semibold" fontSize="sm">Sector Distribution</Text>
          <VStack align="start" gap={2} w="full">
            {allocation.sectors.map((sector, index) => (
              <VStack key={index} align="start" w="full" gap={1}>
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm">{sector.name}</Text>
                  <Text fontSize="sm" fontWeight="semibold">{sector.percentage}%</Text>
                </HStack>
                <Box w="full" h={1.5} bg="gray.200" borderRadius="full" overflow="hidden">
                  <Box h="full" bg="blue.500" w={`${sector.percentage}%`} />
                </Box>
              </VStack>
            ))}
          </VStack>
        </VStack>
      </Grid>
    </Box>
  )
}

// Portfolio Holdings Table Component
function PortfolioHoldingsTable({ portfolioId, onSuccess: _onSuccess }: { portfolioId?: string, onSuccess: () => void }) {
  const { data: positions } = useQuery({
    queryKey: ["positions", portfolioId],
    queryFn: async () => {
      if (!portfolioId) return []
      return await PortfolioService.getPortfolioPositions({ portfolioId })
    },
    enabled: !!portfolioId,
  })

  const [newPosition, setNewPosition] = useState({
    ticker: "",
    quantity: "",
    costPerShare: "",
    purchaseDate: ""
  })

  // const addPositionMutation = useMutation({
  //   mutationFn: (data: { stock_symbol: string, quantity: number, average_price: number }) => 
  //     PortfolioService.addPosition({
  //       portfolioId: portfolioId!,
  //       stockSymbol: data.stock_symbol,
  //       quantity: data.quantity,
  //       averagePrice: data.average_price
  //     }),
  //   onSuccess: () => {
  //     onSuccess()
  //     setNewPosition({ ticker: "", quantity: "", costPerShare: "", purchaseDate: "" })
  //   },
  //   onError: handleError,
  // })

  // const _handleAddPosition = () => {
  //   if (newPosition.ticker && newPosition.quantity && newPosition.costPerShare && portfolioId) {
  //     addPositionMutation.mutate({
  //       stock_symbol: newPosition.ticker.toUpperCase(),
  //       quantity: parseInt(newPosition.quantity),
  //       average_price: parseFloat(newPosition.costPerShare)
  //     })
  //   }
  // }

  // Mock data for Bangladeshi stocks
  const mockPositions = [
    { id: "1", stock_id: "GP", quantity: 100, average_price: 150.25, current_price: 175.50, pnl: 2525, pnl_percent: 16.8, company_name: "Grameenphone Ltd", daily_change: 2.5, portfolio_allocation: 14.2 },
    { id: "2", stock_id: "BRACBANK", quantity: 50, average_price: 280.00, current_price: 295.00, pnl: 750, pnl_percent: 5.36, company_name: "BRAC Bank Ltd", daily_change: -1.2, portfolio_allocation: 11.8 },
    { id: "3", stock_id: "SQUARE", quantity: 200, average_price: 180.00, current_price: 165.00, pnl: -3000, pnl_percent: -8.33, company_name: "Square Pharmaceuticals", daily_change: 0.8, portfolio_allocation: 26.4 },
    { id: "4", stock_id: "BEXIMCO", quantity: 75, average_price: 320.00, current_price: 340.00, pnl: 1500, pnl_percent: 6.25, company_name: "BEXIMCO Ltd", daily_change: 1.5, portfolio_allocation: 19.5 },
  ]

  const displayPositions = Array.isArray(positions) && positions.length > 0 ? positions : mockPositions

  return (
    <VStack align="start" w="full" gap={3}>
      <HStack justify="space-between" w="full">
        <Text fontWeight="semibold" fontSize="lg">Holdings Summary</Text>
        <HStack gap={2}>
          <Button size="sm" variant="outline">
            <FiUpload />
            Import
          </Button>
          <Button size="sm" variant="outline">
            <FiDownload />
            Export
          </Button>
        </HStack>
      </HStack>

      <Box w="full" border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Symbol</Table.ColumnHeader>
              <Table.ColumnHeader>Company</Table.ColumnHeader>
              <Table.ColumnHeader>Quantity</Table.ColumnHeader>
              <Table.ColumnHeader>Avg Cost</Table.ColumnHeader>
              <Table.ColumnHeader>Current</Table.ColumnHeader>
              <Table.ColumnHeader>Market Value</Table.ColumnHeader>
              <Table.ColumnHeader>Total P&L</Table.ColumnHeader>
              <Table.ColumnHeader>Today</Table.ColumnHeader>
              <Table.ColumnHeader>Allocation</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {displayPositions.map((pos: any) => (
              <Table.Row key={pos.id}>
                <Table.Cell>
                  <Text fontWeight="semibold" fontSize="sm">{pos.stock_id}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="xs" color="gray.600" maxW="120px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {pos.company_name || "Company Name"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm">{pos.quantity.toLocaleString()}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm">৳{Number(pos.average_price).toFixed(2)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm">৳{pos.current_price ? Number(pos.current_price).toFixed(2) : "N/A"}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm" fontWeight="semibold">৳{pos.current_price ? (pos.quantity * pos.current_price).toLocaleString() : "N/A"}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm" color={pos.pnl >= 0 ? "green.500" : "red.500"} fontWeight="semibold">
                    {pos.pnl >= 0 ? "+" : ""}৳{pos.pnl ? pos.pnl.toLocaleString() : "N/A"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm" color={pos.daily_change >= 0 ? "green.500" : "red.500"}>
                    {pos.daily_change >= 0 ? "+" : ""}{pos.daily_change ? pos.daily_change.toFixed(1) : "0.0"}%
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm" color="gray.600">{pos.portfolio_allocation ? pos.portfolio_allocation.toFixed(1) : "0.0"}%</Text>
                </Table.Cell>
              </Table.Row>
            ))}
            {/* Add New Position Row */}
            <Table.Row bg="gray.50">
              <Table.Cell>
                <Input 
                  placeholder="GP" 
                  size="sm"
                  value={newPosition.ticker}
                  onChange={(e) => setNewPosition(prev => ({ ...prev, ticker: e.target.value }))}
                />
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="xs" color="gray.500">Auto</Text>
              </Table.Cell>
              <Table.Cell>
                <Input 
                  placeholder="100" 
                  size="sm"
                  type="number"
                  value={newPosition.quantity}
                  onChange={(e) => setNewPosition(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </Table.Cell>
              <Table.Cell>
                <Input 
                  placeholder="150.00" 
                  size="sm"
                  value={newPosition.costPerShare}
                  onChange={(e) => setNewPosition(prev => ({ ...prev, costPerShare: e.target.value }))}
                />
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="xs" color="gray.500">Auto</Text>
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="xs" color="gray.500">Auto</Text>
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="xs" color="gray.500">Auto</Text>
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="xs" color="gray.500">Auto</Text>
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="xs" color="gray.500">Auto</Text>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Box>
    </VStack>
  )
}

// Performance Chart Component
function PerformanceChart({ portfolioId: _portfolioId }: { portfolioId?: string }) {
  const timeframes = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "Max"]
  const [selectedTimeframe, setSelectedTimeframe] = useState("1M")

  return (
    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
      <HStack justify="space-between" mb={3}>
        <Heading size="sm">Performance</Heading>
        <HStack gap={1}>
          {timeframes.map((tf) => (
            <Button
              key={tf}
              size="xs"
              variant={selectedTimeframe === tf ? "solid" : "outline"}
              onClick={() => setSelectedTimeframe(tf)}
            >
              {tf}
            </Button>
          ))}
        </HStack>
      </HStack>
      
      <Box h="200px" bg="gray.50" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={2}>
          <Text fontSize="2xl" fontWeight="bold" color="green.500">+12.3%</Text>
          <Text fontSize="sm" color="gray.600">vs DSEX +8.7%</Text>
          <Text fontSize="xs" color="gray.500">Performance chart will be displayed here</Text>
        </VStack>
      </Box>
    </Box>
  )
}

// Smart Notifications Component
function SmartNotifications({ portfolioId: _portfolioId }: { portfolioId?: string }) {
  const notifications = [
    { id: 1, type: "news", title: "GP Q2 earnings beat expectations", time: "2h ago", priority: "high" },
    { id: 2, type: "dividend", title: "BRACBANK dividend payment scheduled", time: "1d ago", priority: "medium" },
    { id: 3, type: "alert", title: "SQUARE stock dropped 5% today", time: "3h ago", priority: "high" },
    { id: 4, type: "earnings", title: "BEXIMCO earnings release tomorrow", time: "1d ago", priority: "medium" },
  ]

  return (
    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
      <HStack justify="space-between" mb={3}>
        <Heading size="sm">Smart Notifications</Heading>
        <IconButton size="sm" variant="ghost" aria-label="Settings">
          <FiSettings />
        </IconButton>
      </HStack>
      
      <VStack align="start" gap={2}>
        {notifications.map((notification) => (
          <Box key={notification.id} p={2} border="1px solid" borderColor="gray.100" borderRadius="md" w="full">
            <HStack justify="space-between" mb={1}>
              <Badge 
                colorScheme={
                  notification.type === "alert" ? "red" : 
                  notification.type === "dividend" ? "green" : 
                  notification.type === "earnings" ? "purple" : "blue"
                } 
                size="sm"
              >
                {notification.type.toUpperCase()}
              </Badge>
              <Text fontSize="xs" color="gray.500">{notification.time}</Text>
            </HStack>
            <Text fontSize="sm" fontWeight="medium">{notification.title}</Text>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}

// Portfolio Selection Component
function PortfolioSelector({ portfolios, selectedPortfolio, onSelectPortfolio, onCreatePortfolio }: {
  portfolios: PortfolioPublic[]
  selectedPortfolio: PortfolioPublic | null
  onSelectPortfolio: (portfolio: PortfolioPublic) => void
  onCreatePortfolio: () => void
}) {
  return (
    <VStack align="start" w="full" gap={3}>
      <HStack justify="space-between" w="full">
        <Text fontWeight="semibold" fontSize="lg">Select Portfolio</Text>
        <HStack gap={2}>
          <Button size="sm" variant="outline">
            <FiUpload />
            Import Portfolio
          </Button>
          <Button size="sm" onClick={onCreatePortfolio}>
            <FiPlus />
            New Portfolio
          </Button>
        </HStack>
      </HStack>
      
      <Flex gap={3} flexWrap="wrap">
        {portfolios.map((portfolio) => (
          <Box
            key={portfolio.id}
            p={3}
            border="2px solid"
            borderColor={selectedPortfolio?.id === portfolio.id ? "blue.500" : "gray.200"}
            borderRadius="lg"
            bg={selectedPortfolio?.id === portfolio.id ? "blue.50" : "white"}
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              borderColor: selectedPortfolio?.id === portfolio.id ? "blue.500" : "gray.300",
            }}
            onClick={() => onSelectPortfolio(portfolio)}
          >
            <VStack align="start" gap={1}>
              <HStack gap={2}>
                <FiBriefcase size={16} />
                <Text fontWeight="semibold">{portfolio.name}</Text>
                {portfolio.is_default && (
                  <Badge colorScheme="blue" size="sm">Default</Badge>
                )}
              </HStack>
              <Text color="gray.600" fontSize="sm">
                {portfolio.description || "No description"}
              </Text>
            </VStack>
          </Box>
        ))}
      </Flex>
    </VStack>
  )
}

// Premium Features Banner
function PremiumBanner() {
  return (
    <Box p={4} bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" borderRadius="lg" color="white">
      <HStack justify="space-between" align="center">
        <VStack align="start" gap={1}>
          <Text fontWeight="bold" fontSize="lg">Upgrade to Premium Pro</Text>
          <Text fontSize="sm" opacity={0.9}>
            Unlock advanced features: Multiple portfolios, broker sync, analyst data, expert screening, and more
          </Text>
        </VStack>
        <Button colorScheme="white" variant="outline" size="sm">
          <FiStar />
          Upgrade Now
        </Button>
      </HStack>
    </Box>
  )
}

// Main Portfolio Modal Component
function PortfolioModal({ portfolio, isOpen, onClose, onSuccess }: { 
  portfolio?: PortfolioPublic, 
  isOpen: boolean, 
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  
  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<PortfolioCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { 
      name: portfolio?.name || "", 
      description: portfolio?.description || "", 
      is_default: portfolio?.is_default || false, 
      is_active: portfolio?.is_active ?? true 
    },
  })

  const mutation = useMutation({
    mutationFn: (data: PortfolioCreate) => 
      portfolio 
        ? PortfolioService.updatePortfolio({ portfolioId: portfolio.id, requestBody: data })
        : PortfolioService.createPortfolio({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast(portfolio ? "Portfolio updated successfully." : "Portfolio created successfully.")
      reset()
      onClose()
      onSuccess()
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => PortfolioService.deletePortfolio({ portfolioId: portfolio!.id }),
    onSuccess: () => {
      showSuccessToast("Portfolio deleted successfully.")
      onClose()
      onSuccess()
    },
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] })
    },
  })

  const onSubmit: SubmitHandler<PortfolioCreate> = (data) => mutation.mutate(data)

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this portfolio?")) {
      deleteMutation.mutate()
    }
  }

  return (
    <DialogRoot size="full" placement="center" open={isOpen} onOpenChange={({ open }) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <HStack justify="space-between" w="full">
              <DialogTitle>{portfolio ? "Edit Portfolio" : "Create Portfolio"}</DialogTitle>
              <IconButton
                variant="ghost"
                aria-label="Close"
                onClick={onClose}
              >
                <FiX />
              </IconButton>
            </HStack>
          </DialogHeader>
          
          <DialogBody>
            <Flex gap={8} h="600px">
              {/* Left Column - Settings */}
              <VStack align="start" w="300px" gap={6}>
                <Heading size="md">Settings</Heading>
                
                <VStack align="start" gap={4} w="full">
                  <Field label="Portfolio Currency">
                    <Box as="select" defaultValue="BDT" w="full" p={2} border="1px solid" borderColor="gray.300" borderRadius="md">
                      <option value="BDT">BDT (৳)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </Box>
                  </Field>
                  
                  <Field label="Portfolio Name" required invalid={!!errors.name} errorText={errors.name?.message}>
                    <Input 
                      {...register("name", { required: "Name is required." })} 
                      placeholder="Portfolio Name" 
                    />
                  </Field>
                  
                  <Field label="Description" invalid={!!errors.description} errorText={errors.description?.message}>
                    <Input 
                      {...register("description")} 
                      placeholder="Description" 
                    />
                  </Field>
                  
                  <HStack justify="space-between" w="full">
                    <Text>Benchmark</Text>
                    <input type="checkbox" defaultChecked />
                  </HStack>
                  
                  <Field label="Benchmark Symbol">
                    <Input placeholder="DSEX" />
                  </Field>
                </VStack>
              </VStack>

              {/* Right Column - Account Details */}
              <VStack align="start" flex="1" gap={6}>
                <VStack align="start" w="full" gap={4}>
                  <HStack gap={2}>
                    <Text fontWeight="semibold" borderBottom="2px solid" borderColor="blue.500" pb={1}>
                      Account 1
                    </Text>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      aria-label="Add Account"
                    >
                      <FiPlus />
                    </IconButton>
                  </HStack>
                  
                  <VStack align="start" gap={6} w="full">
                    <HStack justify="space-between" w="full">
                      <Text fontWeight="semibold">Account Details</Text>
                    </HStack>
                    
                    <HStack gap={4} w="full">
                      <Field label="Cash Position" flex="1">
                        <Input placeholder="৳ 100000.00" />
                      </Field>
                      <Field label="Currency" w="120px">
                        <Box as="select" defaultValue="BDT" w="full" p={2} border="1px solid" borderColor="gray.300" borderRadius="md">
                          <option value="BDT">BDT</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </Box>  
                      </Field>
                    </HStack>
                  </VStack>
                </VStack>
              </VStack>
            </Flex>
          </DialogBody>
          
          <DialogFooter gap={2}>
            {portfolio && (
              <Button 
                variant="solid" 
                colorScheme="red" 
                onClick={handleDelete}
                loading={deleteMutation.isPending}
              >
                Delete Portfolio
              </Button>
            )}
            <Button 
              variant="subtle" 
              colorPalette="gray" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="solid" 
              type="submit" 
              disabled={!isValid} 
              loading={isSubmitting}
            >
              <FiSave />
              Save Portfolio
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

// Main Portfolio Page Component
function PortfolioPage() {
  const { data: portfolios, isLoading } = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => PortfolioService.getUserPortfolios(),
  })
  
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioPublic | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSelectPortfolio = (portfolio: PortfolioPublic) => {
    setSelectedPortfolio(portfolio)
  }

  const handleCreatePortfolio = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleSuccess = () => {
    // Refetch portfolios
  }

  // Auto-select first portfolio if available
  if (portfolios && portfolios.length > 0 && !selectedPortfolio) {
    const defaultPortfolio = portfolios.find(p => p.is_default) || portfolios[0]
    setSelectedPortfolio(defaultPortfolio)
  }

  return (
    <Container maxW="full" py={6}>
      <VStack align="start" w="full" gap={6}>
        {/* Header */}
        <VStack align="start" w="full" gap={2}>
          <Heading size="lg">Smart Portfolio</Heading>
          <Text color="gray.600">Track your DSE investments with advanced analytics and insights</Text>
        </VStack>
        
        {/* Content */}
        {isLoading ? (
          <Box w="full" py={8} textAlign="center">
            <Text>Loading portfolios...</Text>
          </Box>
        ) : !portfolios || portfolios.length === 0 ? (
          <VStack py={12} textAlign="center" w="full">
            <FiBriefcase size={48} color="#9CA3AF" />
            <Text fontWeight="bold" fontSize="lg">You don't have any portfolios yet</Text>
            <Text color="gray.600">Create your first portfolio to start managing your DSE investments</Text>
            <Button onClick={handleCreatePortfolio} mt={4}>
              <FiPlus />
              Create Portfolio
            </Button>
          </VStack>
        ) : (
          <VStack align="start" w="full" gap={6}>
            {/* Portfolio Selector */}
            <PortfolioSelector
              portfolios={portfolios}
              selectedPortfolio={selectedPortfolio}
              onSelectPortfolio={handleSelectPortfolio}
              onCreatePortfolio={handleCreatePortfolio}
            />
            
            {/* Portfolio Overview - Immediate Value */}
            {selectedPortfolio && (
              <VStack align="start" w="full" gap={4}>
                {/* Portfolio Stats */}
                <PortfolioOverviewStats portfolioId={selectedPortfolio.id} />
                
                {/* Main Content Grid */}
                <Grid templateColumns="2fr 1fr" gap={6} w="full">
                  {/* Left Column - Holdings and Performance */}
                  <VStack align="start" gap={4}>
                    <PortfolioHoldingsTable 
                      portfolioId={selectedPortfolio.id} 
                      onSuccess={() => {
                        // Refetch positions
                      }}
                    />
                    <PerformanceChart portfolioId={selectedPortfolio.id} />
                  </VStack>
                  
                  {/* Right Column - Analytics and Notifications */}
                  <VStack align="start" gap={4}>
                    <AssetAllocation portfolioId={selectedPortfolio.id} />
                    <SmartNotifications portfolioId={selectedPortfolio.id} />
                  </VStack>
                </Grid>
              </VStack>
            )}
            
            {/* Premium Banner */}
            <PremiumBanner />
          </VStack>
        )}
      </VStack>

      {/* Portfolio Modal */}
      <PortfolioModal
        portfolio={undefined}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
      />
    </Container>
  )
}

export const Route = createFileRoute("/_layout/portfolio")({
  component: PortfolioPage,
})

export default PortfolioPage 