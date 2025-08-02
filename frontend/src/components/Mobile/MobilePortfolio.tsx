import React, { useState } from 'react';
import { 
  Box, 
  Text, 
  VStack, 
  HStack, 
  Flex, 
  Badge, 
  Button, 
  IconButton,
  useDisclosure,
  SimpleGrid
} from '@chakra-ui/react';
import { FiPlus, FiTrendingUp, FiTrendingDown, FiDollarSign, FiPercent, FiBarChart } from 'react-icons/fi';
import { useCapacitor } from '../../hooks/useCapacitor';
import { useQuery } from '@tanstack/react-query';
import { PortfolioService } from '../../client';
import type { PortfolioPublic } from '../../client';

const MobilePortfolio: React.FC = () => {
  const { isMobile, triggerHaptic } = useCapacitor();
  const { open, onOpen, onClose } = useDisclosure();
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioPublic | null>(null);

  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => PortfolioService.createPortfolio({ requestBody: { name: 'Test', description: 'Test' } }),
  });

  const handlePortfolioSelect = async (portfolio: PortfolioPublic) => {
    if (isMobile) {
      await triggerHaptic();
    }
    setSelectedPortfolio(portfolio);
  };

  const handleAddPortfolio = async () => {
    if (isMobile) {
      await triggerHaptic();
    }
    onOpen();
  };

  // Mock data for portfolio stats
  const portfolioStats = {
    totalValue: 1250000,
    totalPnL: 85000,
    totalPnLPercent: 7.28,
    dailyPnL: 12500,
    dailyPnLPercent: 1.01,
    cashBalance: 150000,
    positionsCount: 8,
  };

  if (isLoading) {
    return (
      <Box p={4}>
        <Text>Loading portfolios...</Text>
      </Box>
    );
  }

  return (
    <Box>
      {/* Portfolio Overview Cards */}
      <SimpleGrid columns={2} gap={3} mb={6}>
        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
          <VStack align="start" gap={1}>
            <Text fontSize="xs" color="gray.600">Total Value</Text>
            <Text fontSize="lg" fontWeight="bold">৳{portfolioStats.totalValue.toLocaleString()}</Text>
            <HStack gap={1}>
              <Text fontSize="xs" color={portfolioStats.totalPnL >= 0 ? "green.500" : "red.500"}>
                {portfolioStats.totalPnL >= 0 ? "↗" : "↘"} ৳{portfolioStats.totalPnL.toLocaleString()}
              </Text>
            </HStack>
          </VStack>
        </Box>

        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
          <VStack align="start" gap={1}>
            <Text fontSize="xs" color="gray.600">Today's P&L</Text>
            <Text fontSize="lg" fontWeight="bold" color={portfolioStats.dailyPnL >= 0 ? "green.500" : "red.500"}>
              {portfolioStats.dailyPnL >= 0 ? "+" : ""}৳{portfolioStats.dailyPnL.toLocaleString()}
            </Text>
            <Text fontSize="xs" color={portfolioStats.dailyPnL >= 0 ? "green.500" : "red.500"}>
              {portfolioStats.dailyPnL >= 0 ? "↗" : "↘"} {portfolioStats.dailyPnLPercent}%
            </Text>
          </VStack>
        </Box>

        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
          <VStack align="start" gap={1}>
            <Text fontSize="xs" color="gray.600">Cash Balance</Text>
            <Text fontSize="lg" fontWeight="bold" color="blue.500">৳{portfolioStats.cashBalance.toLocaleString()}</Text>
            <Text fontSize="xs" color="gray.500">Available</Text>
          </VStack>
        </Box>

        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
          <VStack align="start" gap={1}>
            <Text fontSize="xs" color="gray.600">Positions</Text>
            <Text fontSize="lg" fontWeight="bold" color="purple.500">{portfolioStats.positionsCount}</Text>
            <Text fontSize="xs" color="gray.500">Active</Text>
          </VStack>
        </Box>
      </SimpleGrid>

      {/* Portfolio List */}
      <Box mb={4}>
        <Flex justify="space-between" align="center" mb={3}>
          <Text fontSize="lg" fontWeight="semibold">Portfolios</Text>
          <IconButton
            aria-label="Add portfolio"
            size="sm"
            colorScheme="blue"
            onClick={handleAddPortfolio}
          >
            <FiPlus />
          </IconButton>
        </Flex>

        <VStack gap={3}>
          {portfolios && Array.isArray(portfolios) && portfolios.map((portfolio: any) => (
            <Box
              key={portfolio.id}
              w="full"
              p={4}
              border="1px solid"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              cursor="pointer"
              onClick={() => handlePortfolioSelect(portfolio)}
              _active={{ transform: 'scale(0.98)' }}
            >
              <Flex justify="space-between" align="center">
                <VStack align="start" gap={1}>
                  <Text fontWeight="semibold">{portfolio.name}</Text>
                  <Text fontSize="sm" color="gray.600">
                    {portfolio.description || 'No description'}
                  </Text>
                  <HStack gap={2}>
                    <Badge colorScheme={portfolio.is_active ? 'green' : 'gray'} size="sm">
                      {portfolio.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {portfolio.is_default && (
                      <Badge colorScheme="blue" size="sm">Default</Badge>
                    )}
                  </HStack>
                </VStack>
                <VStack align="end" gap={1}>
                  <Text fontSize="lg" fontWeight="bold">
                    ৳{portfolioStats.totalValue.toLocaleString()}
                  </Text>
                  <HStack gap={1}>
                    <Text fontSize="sm" color={portfolioStats.totalPnL >= 0 ? "green.500" : "red.500"}>
                      {portfolioStats.totalPnL >= 0 ? "↗" : "↘"} {portfolioStats.totalPnLPercent}%
                    </Text>
                  </HStack>
                </VStack>
              </Flex>
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Quick Actions */}
      <Box>
        <Text fontSize="lg" fontWeight="semibold" mb={3}>Quick Actions</Text>
        <SimpleGrid columns={2} gap={3}>
          <Button
            colorScheme="blue"
            variant="outline"
            size="lg"
            onClick={handleAddPortfolio}
          >
            <FiPlus /> Add Position
          </Button>
          <Button
            colorScheme="green"
            variant="outline"
            size="lg"
          >
            <FiBarChart /> View Analytics
          </Button>
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default MobilePortfolio; 