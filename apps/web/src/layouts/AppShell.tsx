import {
  AppShell,
  Burger,
  Group,
  Text,
  NavLink,
  Stack,
  Badge,
  Divider,
} from '@mantine/core';
import {
  IconLayout2,
  IconRobot,
  IconActivity,
  IconMessageCircle,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { ConnectionIndicator } from '../components/ConnectionIndicator';

export function AppShellLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Board', icon: IconLayout2, path: '/boards' },
    { label: 'Agents', icon: IconRobot, path: '/agents' },
    { label: 'Activity', icon: IconActivity, path: '/activity' },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !sidebarOpen, desktop: !sidebarOpen },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={sidebarOpen}
              onClick={toggleSidebar}
              size="sm"
            />
            <Text
              size="lg"
              fw={700}
              ff="'Inter', sans-serif"
              c="pink"
            >
              Agent Board
            </Text>
          </Group>
          <ConnectionIndicator />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <Stack gap="xs">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={18} />}
              active={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
              variant="filled"
            />
          ))}
          <Divider />
          <NavLink
            label="Project Thread"
            leftSection={<IconMessageCircle size={18} />}
            active={location.pathname.endsWith('/thread')}
            onClick={() => {
              const match = location.pathname.match(/^\/boards\/([^/]+)/);
              if (match) navigate(`/boards/${match[1]}/thread`);
            }}
            variant="filled"
            rightSection={
              <Badge size="xs" color="green" variant="filled">
                live
              </Badge>
            }
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
