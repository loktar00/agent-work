import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from 'react-joyride';
import { Box, Button, Group, Text, Title } from '@mantine/core';
import { useTutorialStore } from '../../stores/tutorialStore';

const TOUR_STEPS: Step[] = [
  {
    target: '[data-testid="nav-boards"]',
    content: 'Use the sidebar to navigate between boards, agents, and activity feeds.',
    title: 'Navigation',
    disableBeacon: true,
  },
  {
    target: '[data-testid="app-header"]',
    content: 'This is your command center header. Access core controls and see your connection status.',
    title: 'Command Center',
  },
  {
    target: '[data-testid="add-column-btn"]',
    content: 'Create columns to organize your workflow into stages like Backlog, In Progress, and Done.',
    title: 'Add Columns',
    isFixed: true,
  },
  {
    target: '[data-testid="add-card-btn"]',
    content: 'Add cards to track tasks and work items. Assign them to agents for automated execution.',
    title: 'Add Cards',
    isFixed: true,
  },
  {
    target: '[data-testid="nav-agents"]',
    content: 'Manage your AI agents here. Configure skills, view run history, and monitor agent activity.',
    title: 'Agent Management',
  },
  {
    target: '[data-testid="connection-indicator"]',
    content: 'Shows real-time connection status. Green means you are connected and receiving live updates.',
    title: 'Connection Status',
  },
];

function CustomTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  size,
}: TooltipRenderProps) {
  return (
    <Box
      {...tooltipProps}
      p="lg"
      style={{
        backgroundColor: '#0a0a14',
        border: '1px solid #00fff2',
        borderRadius: 8,
        boxShadow: '0 0 20px rgba(0, 255, 242, 0.2)',
        maxWidth: 360,
      }}
    >
      {step.title && (
        <Title
          order={5}
          mb="xs"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            color: '#00fff2',
          }}
        >
          {step.title as string}
        </Title>
      )}
      <Text size="sm" c="dimmed" mb="md">
        {step.content}
      </Text>
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {index + 1} / {size}
        </Text>
        <Group gap="xs">
          {index > 0 && (
            <Button
              {...backProps}
              variant="subtle"
              color="gray"
              size="xs"
            >
              Back
            </Button>
          )}
          {continuous ? (
            <Button
              {...primaryProps}
              variant="gradient"
              gradient={{ from: 'cyan', to: 'teal' }}
              size="xs"
            >
              {index === size - 1 ? 'Finish' : 'Next'}
            </Button>
          ) : (
            <Button
              {...closeProps}
              variant="gradient"
              gradient={{ from: 'cyan', to: 'teal' }}
              size="xs"
            >
              Close
            </Button>
          )}
        </Group>
      </Group>
    </Box>
  );
}

export function GuidedTour() {
  const isTourActive = useTutorialStore((s) => s.isTourActive);
  const currentTourStep = useTutorialStore((s) => s.currentTourStep);
  const setTourStep = useTutorialStore((s) => s.setTourStep);
  const stopTour = useTutorialStore((s) => s.stopTour);

  const handleCallback = (data: CallBackProps) => {
    const { status, index, action } = data;

    if (action === 'update') {
      setTourStep(index);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      stopTour();
    }
  };

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={isTourActive}
      stepIndex={currentTourStep}
      continuous
      showSkipButton
      callback={handleCallback}
      tooltipComponent={CustomTooltip}
      spotlightClicks
      disableScrolling
      styles={{
        options: {
          zIndex: 10000,
          overlayColor: 'rgba(0, 0, 0, 0.7)',
        },
        spotlight: {
          borderRadius: 8,
        },
      }}
      floaterProps={{
        styles: {
          arrow: {
            color: '#00fff2',
          },
        },
      }}
    />
  );
}
