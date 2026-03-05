import {
  AppShell,
  ActionIcon,
  Burger,
  Group,
  Text,
  NavLink,
  Stack,
  Divider,
} from '@mantine/core';
import {
  IconLayout2,
  IconRobot,
  IconActivity,
  IconSchool,
  IconHelp,
  IconSettings,
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
    <>
    {/* CRT effects */}
    <div className="scanlines" />
    <div className="glow-blob glow-blob-cyan" />
    <div className="glow-blob glow-blob-magenta" />

    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !sidebarOpen, desktop: !sidebarOpen },
      }}
      padding="md"
      style={{ position: 'relative', zIndex: 1 }}
    >
      <AppShell.Header style={{ backgroundColor: 'rgba(5, 5, 8, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1a1a2e' }} data-testid="app-header">
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={sidebarOpen}
              onClick={toggleSidebar}
              size="sm"
            />
            <Text
              className="glitch-text"
              data-text="AWALL"
              size="lg"
              fw={900}
              variant="gradient"
              gradient={{ from: '#00fff2', to: '#ff00aa', deg: 90 }}
              style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.15em' }}
            >
              AWALL
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
          <Divider my="xs" />
          <NavLink
            label="Settings"
            leftSection={<IconSettings size={18} />}
            active={location.pathname.startsWith('/settings')}
            onClick={() => navigate('/settings')}
            variant="filled"
            data-testid="nav-settings"
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <WelcomeWizard />
      <GuidedTour />
    </AppShell>
    </>
  );
}
