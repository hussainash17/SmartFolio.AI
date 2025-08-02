import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useCapacitor } from '../../hooks/useCapacitor';
import MobileNavigation from './MobileNavigation';
import Navbar from '../Common/Navbar';
import Sidebar from '../Common/Sidebar';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const { isMobile } = useCapacitor();

  // On mobile, show bottom navigation and hide sidebar
  if (isMobile) {
    return (
      <Box minH="100vh" bg="gray.50">
        {/* Mobile header */}
        <Box
          position="sticky"
          top={0}
          zIndex={100}
          bg="white"
          borderBottom="1px solid"
          borderColor="gray.200"
          px={4}
          py={3}
        >
          <Flex justify="space-between" align="center">
            <Box fontSize="lg" fontWeight="bold" color="blue.600">
              SmartStock
            </Box>
          </Flex>
        </Box>

        {/* Main content with bottom padding for navigation */}
        <Box pb="80px" px={4} py={4}>
          {children}
        </Box>

        {/* Bottom navigation */}
        <MobileNavigation />
      </Box>
    );
  }

  // On desktop, show the original layout
  return (
    <Flex minH="100vh">
      <Sidebar />
      <Box flex={1} display="flex" flexDirection="column">
        <Navbar />
        <Box flex={1} p={4}>
          {children}
        </Box>
      </Box>
    </Flex>
  );
};

export default MobileLayout; 