import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  VStack, 
  HStack, 
  Flex, 
  Grid, 
  Badge,
  Button,
  IconButton,
  Input
} from "@chakra-ui/react"
import { 
  FiPlus, 
  FiSearch, 
  FiBell, 
  FiSettings, 
  FiTrendingUp, 
  FiDollarSign 
} from "react-icons/fi"
import { PortfolioService } from "@/client"
import { AddStockPositionModal } from "@/components/features/AddStockPositionModal"

// Top Navigation Bar Component
const TopNavigationBar: React.FC = () => (
  <Box 
    bg="white" 
    borderBottom="1px solid" 
    borderColor="gray.200" 
    px={6} 
    py={3}
    position="sticky"
    top={0}
    zIndex={10}
  >
    <Flex justify="space-between" align="center">
      {/* Financial Stats */}
      <HStack spacing={8}>
        <Box>
          <Text fontSize="xs" color="gray.600">Total Value</Text>
          <Text fontSize="lg" fontWeight="bold">$150.0K</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.600">Buying Power</Text>
          <Text fontSize="lg" fontWeight="bold">$25.0K</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.600">Cash</Text>
          <Text fontSize="lg" fontWeight="bold">$25.5K</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.600">Today's P&L</Text>
          <Text fontSize="lg" fontWeight="bold" color="green.500">+$2.3K (+1.5%)</Text>
        </Box>
      </HStack>

      {/* Search and Actions */}
      <HStack spacing={4}>
        <Box position="relative">
          <Input 
            placeholder="Search stocks, ETFs..." 
            size="sm" 
            pl={10}
            w="300px"
            bg="gray.50"
            border="1px solid"
            borderColor="gray.200"
          />
          <FiSearch 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#6B7280'
            }} 
          />
        </Box>
        <Button size="sm" colorScheme="green">
          Quick Trade
        </Button>
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Notifications"
        >
          <FiBell />
        </IconButton>
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Settings"
        >
          <FiSettings />
        </IconButton>
      </HStack>
    </Flex>
  </Box>
)

// Summary Cards Component
const SummaryCards: React.FC = () => (
  <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
    <Box bg="white" p={6} borderRadius="xl" border="1px solid" borderColor="gray.200">
      <Text fontSize="sm" color="gray.600" mb={1}>Total Value</Text>
      <Text fontSize="2xl" fontWeight="bold">$40,967.15</Text>
    </Box>
    <Box bg="white" p={6} borderRadius="xl" border="1px solid" borderColor="gray.200">
      <Text fontSize="sm" color="gray.600" mb={1}>Total Gain/Loss</Text>
      <Text fontSize="2xl" fontWeight="bold" color="green.500">$3,210.65</Text>
      <Text fontSize="sm" color="green.500">+8.50%</Text>
    </Box>
    <Box bg="white" p={6} borderRadius="xl" border="1px solid" borderColor="gray.200">
      <Text fontSize="sm" color="gray.600" mb={1}>Day Change</Text>
      <Text fontSize="2xl" fontWeight="bold" color="green.500">$491.61</Text>
      <Text fontSize="sm" color="green.500">+1.20%</Text>
    </Box>
    <Box bg="white" p={6} borderRadius="xl" border="1px solid" borderColor="gray.200">
      <Text fontSize="sm" color="gray.600" mb={1}>Portfolios</Text>
      <Text fontSize="2xl" fontWeight="bold">2</Text>
    </Box>
  </Grid>
)

// Portfolio Card Component
interface PortfolioCardProps {
  name: string
  tagline: string
  totalValue: string
  gainLoss: string
  gainPercent: string
  holdings: number
  cash: string
  onAddPosition: () => void
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ 
  name, 
  tagline, 
  totalValue, 
  gainLoss, 
  gainPercent, 
  holdings, 
  cash,
  onAddPosition
}) => (
  <Box
    bg="white"
    p={6}
    borderRadius="xl"
    border="1px solid"
    borderColor="gray.200"
    cursor="pointer"
    _hover={{
      borderColor: "blue.300",
      boxShadow: "lg",
      transform: "translateY(-2px)",
    }}
    transition="all 0.2s"
  >
    <VStack align="start" spacing={4}>
      {/* Header */}
      <Flex justify="space-between" align="start" w="full">
        <VStack align="start" spacing={1}>
          <Text fontSize="lg" fontWeight="bold">{name}</Text>
          <Text fontSize="sm" color="gray.600">{tagline}</Text>
        </VStack>
        <Badge 
          bg="black" 
          color="white" 
          px={3} 
          py={1} 
          borderRadius="full"
          fontSize="sm"
        >
          +{gainPercent}%
        </Badge>
      </Flex>

      {/* Stats */}
      <Grid templateColumns="1fr 1fr" gap={4} w="full">
        <Box>
          <Text fontSize="xs" color="gray.600">Total Value</Text>
          <Text fontSize="lg" fontWeight="bold">{totalValue}</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.600">Gain/Loss</Text>
          <Text fontSize="lg" fontWeight="bold" color="green.500">{gainLoss}</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.600">Holdings</Text>
          <Text fontSize="lg" fontWeight="bold">{holdings} stocks</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.600">Cash</Text>
          <Text fontSize="lg" fontWeight="bold">{cash}</Text>
        </Box>
      </Grid>

      {/* Action Buttons */}
      <Flex gap={2} w="full">
        <Button size="sm" variant="outline" flex={1}>
          <FiTrendingUp />
          View Details
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          flex={1}
          onClick={(e) => {
            e.stopPropagation()
            onAddPosition()
          }}
        >
          <FiPlus />
          Add Position
        </Button>
      </Flex>
    </VStack>
  </Box>
)

export const PortfolioPage: React.FC = () => {
  const { data: portfolios, isLoading, error } = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => PortfolioService.getUserPortfolios(),
  })
  
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false)
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("")

  const handleAddPosition = (portfolioId: string) => {
    console.log('Add position clicked for portfolio:', portfolioId)
    setSelectedPortfolioId(portfolioId)
    setIsAddPositionModalOpen(true)
  }

  const handleCloseAddPositionModal = () => {
    setIsAddPositionModalOpen(false)
    setSelectedPortfolioId("")
  }

  return (
    <Box bg="gray.50" minH="100vh">
      {/* Top Navigation Bar */}
      <TopNavigationBar />
      
      {/* Main Content */}
      <Container maxW="7xl" py={8}>
        <VStack align="start" spacing={8}>
          {/* Header */}
          <VStack align="start" spacing={2}>
            <Heading size="lg" fontWeight="bold">My Portfolios</Heading>
            <Text color="gray.600" fontSize="lg">Manage and monitor your investment portfolios</Text>
          </VStack>
          
          {/* Summary Cards */}
          <SummaryCards />
          
          {/* Portfolios Section */}
          <Box w="full">
            <Flex justify="space-between" align="center" mb={6}>
              <Heading size="md" fontWeight="semibold">Your Portfolios</Heading>
              <Button colorScheme="blue">
                <FiPlus />
                Create Portfolio
              </Button>
            </Flex>
            
            {isLoading ? (
              <Box textAlign="center" py={12}>
                <Text>Loading portfolios...</Text>
              </Box>
            ) : error ? (
              <Box textAlign="center" py={12}>
                <Text color="red.500">Error loading portfolios: {error.message}</Text>
              </Box>
            ) : !portfolios || portfolios.length === 0 ? (
              <Box 
                textAlign="center" 
                py={16} 
                bg="white" 
                borderRadius="lg" 
                border="2px dashed" 
                borderColor="gray.300"
              >
                <FiPlus size={48} style={{ margin: '0 auto 16px', color: '#9CA3AF' }} />
                <Text fontSize="lg" fontWeight="semibold" mb={2}>No portfolios yet</Text>
                <Text color="gray.600" mb={6}>Create your first portfolio to start tracking your investments</Text>
                <Button size="lg">
                  <FiPlus />
                  Create Your First Portfolio
                </Button>
              </Box>
            ) : (
              <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={6}>
                <PortfolioCard
                  name="Growth Portfolio"
                  tagline="High-growth technology stocks"
                  totalValue="$26,834.55"
                  gainLoss="$2,482.05"
                  gainPercent="10.19"
                  holdings={3}
                  cash="$5,000.00"
                  onAddPosition={() => handleAddPosition("growth-portfolio-id")}
                />
                
                <PortfolioCard
                  name="Dividend Portfolio"
                  tagline="Stable dividend-paying stocks"
                  totalValue="$14,132.60"
                  gainLoss="$728.60"
                  gainPercent="5.44"
                  holdings={2}
                  cash="$2,500.00"
                  onAddPosition={() => handleAddPosition("dividend-portfolio-id")}
                />
              </Grid>
            )}
          </Box>
        </VStack>
      </Container>

      {/* Add Stock Position Modal */}
      <AddStockPositionModal
        isOpen={isAddPositionModalOpen}
        onClose={handleCloseAddPositionModal}
        portfolioId={selectedPortfolioId}
        onSuccess={() => {
          // Refetch portfolios
        }}
      />
    </Box>
  )
} 