import { Box, Flex } from "@chakra-ui/react"
import { Outlet } from "@tanstack/react-router"

import { PortfolioMaxSidebar } from "./PortfolioMaxSidebar"
import { PortfolioMaxTopBar } from "./PortfolioMaxTopBar"

interface PortfolioMaxLayoutProps {
  children?: React.ReactNode
}

export const PortfolioMaxLayout: React.FC<PortfolioMaxLayoutProps> = ({ children }) => {
  return (
    <Flex h="100vh" bg="gray.50">
      {/* Sidebar */}
      <PortfolioMaxSidebar />
      
      {/* Main Content Area */}
      <Box flex="1" display="flex" flexDirection="column" overflow="hidden">
        {/* Top Bar */}
        <PortfolioMaxTopBar />
        
        {/* Page Content */}
        <Box flex="1" overflow="auto" p={6}>
          {children || <Outlet />}
        </Box>
      </Box>
    </Flex>
  )
}

export default PortfolioMaxLayout 