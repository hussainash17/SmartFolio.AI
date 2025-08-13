import React from "react"
import { Box, Container, Heading, Text, Grid, VStack } from "@chakra-ui/react"
import { FiTrendingUp, FiDollarSign, FiPieChart, FiBarChart } from "react-icons/fi"

export const DashboardPage: React.FC = () => {
  return (
    <Box bg="gray.50" minH="100vh" p={8}>
      <Container maxW="7xl">
        <VStack align="start" spacing={8}>
          <Box>
            <Heading size="lg" fontWeight="bold" mb={2}>
              Dashboard
            </Heading>
            <Text color="gray.600">
              Welcome back! Here's an overview of your investment portfolio.
            </Text>
          </Box>

          {/* Summary Cards */}
          <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6} w="full">
            <Box bg="white" p={6} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Box display="flex" alignItems="center" mb={4}>
                <FiTrendingUp size={24} color="#10B981" />
                <Text ml={3} fontSize="lg" fontWeight="semibold">Total Portfolio Value</Text>
              </Box>
              <Text fontSize="3xl" fontWeight="bold">$150,234.56</Text>
              <Text fontSize="sm" color="green.500">+$2,345.67 (+1.58%)</Text>
            </Box>

            <Box bg="white" p={6} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Box display="flex" alignItems="center" mb={4}>
                <FiDollarSign size={24} color="#3B82F6" />
                <Text ml={3} fontSize="lg" fontWeight="semibold">Today's P&L</Text>
              </Box>
              <Text fontSize="3xl" fontWeight="bold" color="green.500">+$1,234.56</Text>
              <Text fontSize="sm" color="green.500">+0.83%</Text>
            </Box>

            <Box bg="white" p={6} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Box display="flex" alignItems="center" mb={4}>
                <FiPieChart size={24} color="#8B5CF6" />
                <Text ml={3} fontSize="lg" fontWeight="semibold">Active Portfolios</Text>
              </Box>
              <Text fontSize="3xl" fontWeight="bold">3</Text>
              <Text fontSize="sm" color="gray.500">Growth, Dividend, Tech</Text>
            </Box>

            <Box bg="white" p={6} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Box display="flex" alignItems="center" mb={4}>
                <FiBarChart size={24} color="#F59E0B" />
                <Text ml={3} fontSize="lg" fontWeight="semibold">Total Holdings</Text>
              </Box>
              <Text fontSize="3xl" fontWeight="bold">24</Text>
              <Text fontSize="sm" color="gray.500">Stocks & ETFs</Text>
            </Box>
          </Grid>

          {/* Quick Actions */}
          <Box w="full">
            <Heading size="md" mb={4}>Quick Actions</Heading>
            <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
              <Box bg="white" p={4} borderRadius="lg" border="1px solid" borderColor="gray.200" cursor="pointer" _hover={{ borderColor: "blue.300" }}>
                <Text fontWeight="semibold">Add Position</Text>
                <Text fontSize="sm" color="gray.600">Add new stock to portfolio</Text>
              </Box>
              <Box bg="white" p={4} borderRadius="lg" border="1px solid" borderColor="gray.200" cursor="pointer" _hover={{ borderColor: "blue.300" }}>
                <Text fontWeight="semibold">Create Portfolio</Text>
                <Text fontSize="sm" color="gray.600">Start a new portfolio</Text>
              </Box>
              <Box bg="white" p={4} borderRadius="lg" border="1px solid" borderColor="gray.200" cursor="pointer" _hover={{ borderColor: "blue.300" }}>
                <Text fontWeight="semibold">Market Analysis</Text>
                <Text fontSize="sm" color="gray.600">View market insights</Text>
              </Box>
            </Grid>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
} 