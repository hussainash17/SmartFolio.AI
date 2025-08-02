import React from 'react';
import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { Link as RouterLink, useRouter } from '@tanstack/react-router';
import { FiHome, FiBriefcase, FiEye, FiSettings, FiTrendingUp } from 'react-icons/fi';
import { useCapacitor } from '../../hooks/useCapacitor';

interface NavItem {
  icon: React.ComponentType;
  title: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: FiHome, title: 'Dashboard', path: '/' },
  { icon: FiBriefcase, title: 'Portfolio', path: '/portfolio' },
  { icon: FiEye, title: 'Watchlist', path: '/watchlist' },
  { icon: FiTrendingUp, title: 'Items', path: '/items' },
  { icon: FiSettings, title: 'Settings', path: '/settings' },
];

const MobileNavigation: React.FC = () => {
  const router = useRouter();
  const { isMobile, triggerHaptic } = useCapacitor();
  const currentPath = router.state.location.pathname;

  const handleNavClick = async () => {
    if (isMobile) {
      await triggerHaptic();
    }
  };

  if (!isMobile) {
    return null; // Only show on mobile
  }

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="white"
      borderTop="1px solid"
      borderColor="gray.200"
      zIndex={1000}
      pb="env(safe-area-inset-bottom)"
    >
      <Flex justify="space-around" py={2}>
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <RouterLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
            >
              <Flex
                direction="column"
                align="center"
                justify="center"
                minH="60px"
                px={2}
                py={1}
                borderRadius="md"
                bg={isActive ? 'blue.50' : 'transparent'}
                color={isActive ? 'blue.600' : 'gray.600'}
                _active={{
                  bg: 'blue.100',
                }}
                gap={1}
              >
                <Icon
                  as={item.icon}
                  boxSize={5}
                  color={isActive ? 'blue.600' : 'gray.500'}
                />
                <Text
                  fontSize="xs"
                  fontWeight={isActive ? 'semibold' : 'normal'}
                  textAlign="center"
                >
                  {item.title}
                </Text>
              </Flex>
            </RouterLink>
          );
        })}
      </Flex>
    </Box>
  );
};

export default MobileNavigation; 