import { Box, Flex, Text, Badge, IconButton } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { useState, useCallback } from "react"
import { 
  FiHome, 
  FiBriefcase, 
  FiTrendingUp, 
  FiPieChart, 
  FiTarget,
  FiDollarSign,
  FiShoppingCart,
  FiBarChart,
  FiEye,
  FiSearch,
  FiUser,
  FiSettings,
  FiHelpCircle,
  FiLogOut,
  FiChevronDown,
  FiChevronRight
} from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import type { UserPublic } from "@/client"
import { useAuth } from "@/hooks/useAuth"
import Logo from "/assets/images/portfoliomax-logo.svg"

interface NavItem {
  icon: IconType
  title: string
  path: string
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
  collapsed?: boolean
}

const navigationSections: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { icon: FiHome, title: "Dashboard", path: "/" }
    ]
  },
  {
    title: "PORTFOLIO",
    items: [
      { icon: FiBriefcase, title: "My Portfolios", path: "/portfolio" },
      { icon: FiTrendingUp, title: "Performance", path: "/portfolio/performance" },
      { icon: FiPieChart, title: "Asset Allocation", path: "/portfolio/allocation" },
      { icon: FiTarget, title: "Investment Goals", path: "/portfolio/goals" }
    ]
  },
  {
    title: "TRADING",
    items: [
      { icon: FiDollarSign, title: "Trade", path: "/trading" },
      { icon: FiShoppingCart, title: "Orders & Trades", path: "/trading/orders" },
      { icon: FiBarChart, title: "Market Data", path: "/trading/market-data" },
      { icon: FiEye, title: "Watchlists", path: "/watchlist" }
    ]
  },
  {
    title: "RESEARCH",
    items: [
      { icon: FiSearch, title: "Stock Screener", path: "/research/screener" },
      { icon: FiBarChart, title: "Market Analysis", path: "/research/analysis" }
    ],
    collapsed: true
  }
]

const bottomItems: NavItem[] = [
  { icon: FiUser, title: "Account", path: "/account" },
  { icon: FiSettings, title: "Settings", path: "/settings" },
  { icon: FiHelpCircle, title: "Help & Support", path: "/help" }
]

// Reusable components
const UserAvatar: React.FC<{ name?: string }> = ({ name }) => {
  const getUserInitials = (name?: string): string => {
    return (name || "U").charAt(0).toUpperCase()
  }

  return (
    <Box
      w={8}
      h={8}
      borderRadius="full"
      bg="brand.500"
      display="flex"
      alignItems="center"
      justifyContent="center"
      color="white"
      fontSize="sm"
      fontWeight="bold"
    >
      {getUserInitials(name)}
    </Box>
  )
}

const NavigationItem: React.FC<{
  item: NavItem
  onClick: (path: string) => void
}> = ({ item, onClick }) => (
  <Link to={item.path} onClick={() => onClick(item.path)}>
    <Flex
      align="center"
      gap={3}
      px={4}
      py={2}
      mx={2}
      borderRadius="md"
      _hover={{ bg: "brand.50" }}
      _active={{ bg: "brand.100" }}
    >
      <Box color="gray.500">
        <item.icon size={16} />
      </Box>
      <Text fontSize="sm" color="gray.700" flex="1">
        {item.title}
      </Text>
      {item.badge && (
        <Badge size="sm" colorScheme="brand" variant="subtle">
          {item.badge}
        </Badge>
      )}
    </Flex>
  </Link>
)

const NavigationSection: React.FC<{
  section: NavSection
  isCollapsed: boolean
  onToggle: () => void
  onNavigate: (path: string) => void
}> = ({ section, isCollapsed, onToggle, onNavigate }) => (
  <Box mb={4}>
    <Flex
      justify="space-between"
      align="center"
      px={4}
      py={2}
      cursor="pointer"
      onClick={onToggle}
      _hover={{ bg: "gray.50" }}
    >
      <Text fontSize="xs" fontWeight="bold" color="gray.600" textTransform="uppercase">
        {section.title}
      </Text>
      {section.items.length > 1 && (
        <Box
          as="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          p={1}
          borderRadius="sm"
          _hover={{ bg: "gray.100" }}
        >
          {isCollapsed ? <FiChevronRight size={12} /> : <FiChevronDown size={12} />}
        </Box>
      )}
    </Flex>
    
    {!isCollapsed && (
      <Box>
        {section.items.map((item) => (
          <NavigationItem key={item.path} item={item} onClick={onNavigate} />
        ))}
      </Box>
    )}
  </Box>
)

export const Sidebar: React.FC = () => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const { logout } = useAuth()
  const navigate = useNavigate()
  
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    research: true
  })

  const toggleSection = useCallback((sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }, [])

  const handleNavigation = useCallback((path: string) => {
    console.log(`Navigating to: ${path}`)
    navigate({ to: path })
  }, [navigate])

  const handleLogout = useCallback(() => {
    console.log('Logout clicked')
    logout()
  }, [logout])

  return (
    <Box
      bg="white"
      borderRight="1px solid"
      borderColor="gray.200"
      w="280px"
      h="100vh"
      display="flex"
      flexDirection="column"
      position="sticky"
      top={0}
      left={0}
    >
      {/* Logo Section */}
      <Box p={6} borderBottom="1px solid" borderColor="gray.100">
        <Link to="/">
          <Flex align="center" gap={2}>
            <img src={Logo} alt="PortfolioMax" style={{ height: "28px" }} />
            <Text fontSize="lg" fontWeight="bold" color="gray.800">
              PortfolioMax
            </Text>
          </Flex>
        </Link>
      </Box>

      {/* User Info Section */}
      <Box p={4} borderBottom="1px solid" borderColor="gray.100">
        <Flex align="center" gap={3}>
          <UserAvatar name={currentUser?.full_name} />
          <Box flex="1" minW={0}>
            <Text fontSize="sm" fontWeight="medium" color="gray.800" isTruncated>
              {currentUser?.full_name || "John Doe"}
            </Text>
            <Text fontSize="xs" color="gray.500" isTruncated>
              {currentUser?.email || "john.doe@example.com"}
            </Text>
            <Flex gap={1} mt={1}>
              <Badge size="sm" colorScheme="purple" variant="subtle">
                Premium
              </Badge>
              <Badge size="sm" colorScheme="green" variant="subtle">
                Verified
              </Badge>
            </Flex>
          </Box>
        </Flex>
      </Box>

      {/* Navigation Sections */}
      <Box flex="1" overflowY="auto" py={2}>
        {navigationSections.map((section) => (
          <NavigationSection
            key={section.title}
            section={section}
            isCollapsed={collapsedSections[section.title.toLowerCase()]}
            onToggle={() => toggleSection(section.title.toLowerCase())}
            onNavigate={handleNavigation}
          />
        ))}
      </Box>

      {/* Fixed Bottom Section */}
      <Box borderTop="1px solid" borderColor="gray.100" p={2}>
        {bottomItems.map((item) => (
          <NavigationItem key={item.path} item={item} onClick={handleNavigation} />
        ))}
        
        <Box borderTop="1px solid" borderColor="gray.200" my={2} />
        
        <Flex
          as="button"
          align="center"
          gap={3}
          px={4}
          py={2}
          mx={2}
          borderRadius="md"
          onClick={handleLogout}
          _hover={{ bg: "red.50" }}
          color="red.600"
        >
          <FiLogOut size={16} />
          <Text fontSize="sm" fontWeight="medium">
            Sign Out
          </Text>
        </Flex>
      </Box>
    </Box>
  )
} 