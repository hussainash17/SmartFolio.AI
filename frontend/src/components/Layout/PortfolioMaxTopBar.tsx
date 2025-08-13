import { Box, Flex, Text, Input, Button } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { FiBell, FiSettings, FiSearch } from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import Logo from "/assets/images/portfoliomax-logo.svg"

interface TopBarMetric {
  label: string
  value: string
  color?: string
  subtitle?: string
}

interface TopBarProps {
  metrics?: TopBarMetric[]
  onQuickTrade?: () => void
  onSearch?: (query: string) => void
}

const defaultMetrics: TopBarMetric[] = [
  { label: "Total Value", value: "$150.0K" },
  { label: "Buying Power", value: "$25.0K" },
  { label: "Cash", value: "$25.5K" },
  { label: "Today's P&L", value: "$2.3K +1.50%", color: "green.500" }
]

export const PortfolioMaxTopBar: React.FC<TopBarProps> = ({
  metrics = defaultMetrics,
  onQuickTrade,
  onSearch
}) => {
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch?.(event.target.value)
  }

  const handleQuickTrade = () => {
    onQuickTrade?.()
  }

  return (
    <Flex
      justify="space-between"
      align="center"
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      px={6}
      py={4}
      position="sticky"
      top={0}
      zIndex={10}
    >
      {/* Left Section - Logo */}
      <Link to="/">
        <Flex align="center" gap={2}>
          <img src={Logo} alt="PortfolioMax" style={{ height: "32px" }} />
          <Text fontSize="lg" fontWeight="bold" color="gray.800">
            PortfolioMax Investment Platform
          </Text>
        </Flex>
      </Link>

      {/* Center Section - Financial Metrics */}
      <Flex gap={6} align="center">
        {metrics.map((metric) => (
          <Box key={metric.label} textAlign="center">
            <Text fontSize="xs" color="gray.600" fontWeight="medium">
              {metric.label}
            </Text>
            <Text 
              fontSize="lg" 
              fontWeight="bold" 
              color={metric.color || "gray.800"}
            >
              {metric.value}
            </Text>
            {metric.subtitle && (
              <Text fontSize="xs" color="gray.500">
                {metric.subtitle}
              </Text>
            )}
          </Box>
        ))}
      </Flex>

      {/* Right Section - Search and Actions */}
      <Flex gap={4} align="center">
        {/* Search Bar */}
        <Box position="relative" w="300px">
          <Input
            placeholder="Search stocks, ETFs..."
            pl={10}
            pr={4}
            py={2}
            border="1px solid"
            borderColor="gray.300"
            borderRadius="lg"
            bg="gray.50"
            onChange={handleSearch}
            _focus={{
              bg: "white",
              borderColor: "brand.500",
              boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)"
            }}
          />
          <Box
            position="absolute"
            left={3}
            top="50%"
            transform="translateY(-50%)"
            color="gray.400"
          >
            <FiSearch size={16} />
          </Box>
        </Box>

        {/* Action Buttons */}
        <Button
          colorScheme="brand"
          size="sm"
          fontWeight="medium"
          px={4}
          onClick={handleQuickTrade}
        >
          + Quick Trade
        </Button>

        <Box
          as="button"
          p={2}
          borderRadius="md"
          color="gray.600"
          _hover={{ bg: "gray.100" }}
          aria-label="Notifications"
        >
          <FiBell size={18} />
        </Box>

        <Box
          as="button"
          p={2}
          borderRadius="md"
          color="gray.600"
          _hover={{ bg: "gray.100" }}
          aria-label="Settings"
        >
          <FiSettings size={18} />
        </Box>
      </Flex>
    </Flex>
  )
}

export default PortfolioMaxTopBar 