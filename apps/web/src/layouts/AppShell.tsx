import {
  AppShell,
  ActionIcon,
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
  IconSchool,
  IconHelp,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { useTutorialStore } from '../stores/tutorialStore';
import { ConnectionIndicator } from '../components/ConnectionIndicator';
import { WelcomeWizard } from '../components/tutorial/WelcomeWizard';
import { GuidedTour } from '../components/tutorial/GuidedTour';

export function AppShellLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const startTour = useTutorialStore((s) => s.startTour);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Board', icon: IconLayout2, path: '/boards', testId: 'nav-boards' },
    { label: 'Agents', icon: IconRobot, path: '/agents', testId: 'nav-agents' },
    { label: 'Activity', icon: IconActivity, path: '/activity', testId: 'nav-activity' },
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
      <AppShell.Header style={{ backgroundColor: '#050508' }} data-testid="app-header">
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
              variant="gradient"
              gradient={{ from: '#00fff2', to: '#ff00aa', deg: 90 }}
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              NEONSYNC
            </Text>
          </Group>
          <Group gap="sm">
            <ActionIcon
              variant="subtle"
              color="cyan"
              size="md"
              onClick={startTour}
              title="Start guided tour"
              data-testid="help-tour-btn"
            >
              <IconHelp size={18} />
            </ActionIcon>
            <ConnectionIndicator />
          </Group>
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
              data-testid={item.testId}
            />
          ))}
          <NavLink
            label="Tutorial"
            leftSection={<IconSchool size={18} />}
            active={location.pathname.startsWith('/tutorial')}
            onClick={() => navigate('/tutorial')}
            variant="filled"
            data-testid="nav-tutorial"
          />
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

      <WelcomeWizard />
      <GuidedTour />
    </AppShell>
  );
}
