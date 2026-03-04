import {
  Grid,
  Title,
  Text,
  Stack,
  Checkbox,
  Paper,
  Anchor,
  Box,
  ThemeIcon,
  Group,
  Button,
} from '@mantine/core';
import {
  IconLayout2,
  IconColumns,
  IconCards,
  IconArrowsMove,
  IconRobot,
  IconSparkles,
  IconConfetti,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTutorialStore } from '../stores/tutorialStore';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  link?: string;
  linkLabel?: string;
  tips: string[];
}

const STEPS: TutorialStep[] = [
  {
    id: 'create-board',
    title: 'Create a Board',
    description: 'Boards are the foundation of your workflow. Each board contains columns and cards.',
    icon: IconLayout2,
    link: '/boards',
    linkLabel: 'Go to Boards',
    tips: [
      'Give your board a descriptive name to keep things organized.',
      'You can create multiple boards for different projects.',
      'Use the description field to add context about the board purpose.',
    ],
  },
  {
    id: 'add-columns',
    title: 'Add Columns',
    description: 'Columns represent stages in your workflow. Common setups include Backlog, In Progress, Review, and Done.',
    icon: IconColumns,
    tips: [
      'Start with 3-4 columns to keep things simple.',
      'You can reorder columns by dragging them.',
      'Column names should reflect your actual workflow stages.',
    ],
  },
  {
    id: 'create-cards',
    title: 'Create Cards',
    description: 'Cards are individual tasks or work items. Add details, assign agents, and track progress.',
    icon: IconCards,
    tips: [
      'Use clear, actionable titles for your cards.',
      'Add descriptions with acceptance criteria.',
      'Cards can be assigned to AI agents for automated execution.',
    ],
  },
  {
    id: 'drag-drop',
    title: 'Drag & Drop',
    description: 'Move cards between columns by dragging them. This updates the card status and triggers any connected automations.',
    icon: IconArrowsMove,
    tips: [
      'Drag cards horizontally between columns to update status.',
      'Reorder cards within a column by dragging vertically.',
      'Moving a card to "Done" can trigger completion workflows.',
    ],
  },
  {
    id: 'create-agent',
    title: 'Create an Agent',
    description: 'AI agents can automate tasks on your board. Configure their skills and let them handle the work.',
    icon: IconRobot,
    link: '/agents',
    linkLabel: 'Go to Agents',
    tips: [
      'Agents have configurable skills that define what they can do.',
      'Monitor agent activity in real-time via the activity feed.',
      'Start with a simple agent and add complexity over time.',
    ],
  },
  {
    id: 'explore',
    title: 'Explore',
    description: 'You have learned the basics! Explore the rest of the application at your own pace.',
    icon: IconSparkles,
    tips: [
      'Check out the Activity feed to see a timeline of all events.',
      'Use the Project Thread for real-time team communication.',
      'The connection indicator shows your real-time sync status.',
    ],
  },
];

function TutorialPage() {
  const tutorialProgress = useTutorialStore((s) => s.tutorialProgress);
  const markTutorialStep = useTutorialStore((s) => s.markTutorialStep);
  const [selectedStep, setSelectedStep] = useState(0);

  const completedCount = STEPS.filter((s) => tutorialProgress[s.id]).length;
  const allDone = completedCount === STEPS.length;
  const current = STEPS[selectedStep];

  return (
    <Box maw={1200} mx="auto">
      <Stack gap="lg">
        <div>
          <Title
            order={2}
            style={{
              fontFamily: "'Orbitron', sans-serif",
              background: 'linear-gradient(90deg, #00fff2, #ff00e5)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Tutorial
          </Title>
          <Text c="dimmed" size="sm" mt={4}>
            Complete each step to learn the fundamentals of NEONSYNC.
          </Text>
        </div>

        <Grid gutter="lg">
          {/* Left panel - Checklist */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper
              p="md"
              style={{
                backgroundColor: 'rgba(10, 10, 20, 0.6)',
                border: '1px solid rgba(0, 255, 242, 0.15)',
              }}
            >
              <Stack gap="xs">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600} c="white">
                    Progress
                  </Text>
                  <Text size="xs" c="cyan">
                    {completedCount} / {STEPS.length}
                  </Text>
                </Group>

                {STEPS.map((step, i) => (
                  <Paper
                    key={step.id}
                    p="sm"
                    style={{
                      backgroundColor:
                        selectedStep === i
                          ? 'rgba(0, 255, 242, 0.08)'
                          : 'transparent',
                      border:
                        selectedStep === i
                          ? '1px solid rgba(0, 255, 242, 0.3)'
                          : '1px solid transparent',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setSelectedStep(i)}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Checkbox
                        checked={!!tutorialProgress[step.id]}
                        onChange={() => markTutorialStep(step.id)}
                        color="cyan"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        styles={{
                          input: {
                            backgroundColor: 'rgba(10, 10, 20, 0.8)',
                            borderColor: 'rgba(0, 255, 242, 0.4)',
                          },
                        }}
                      />
                      <div>
                        <Text
                          size="sm"
                          fw={500}
                          c={tutorialProgress[step.id] ? 'dimmed' : 'white'}
                          td={tutorialProgress[step.id] ? 'line-through' : undefined}
                        >
                          {step.title}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Right panel - Details */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            {allDone ? (
              <Paper
                p="xl"
                style={{
                  backgroundColor: 'rgba(10, 10, 20, 0.6)',
                  border: '1px solid rgba(0, 255, 242, 0.3)',
                  textAlign: 'center',
                }}
              >
                <Stack align="center" gap="lg" py="xl">
                  <Box
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'rgba(0, 255, 242, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #00fff2',
                      boxShadow: '0 0 30px rgba(0, 255, 242, 0.3)',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  >
                    <IconConfetti size={40} color="#00fff2" />
                  </Box>
                  <Title order={2} c="white">
                    Tutorial Complete!
                  </Title>
                  <Text c="dimmed" maw={400}>
                    You have mastered the fundamentals of NEONSYNC.
                    Now go build something amazing with your AI-powered board.
                  </Text>
                  <Button
                    component={Link}
                    to="/boards"
                    variant="gradient"
                    gradient={{ from: 'cyan', to: 'pink' }}
                    size="lg"
                  >
                    Go to Boards
                  </Button>
                </Stack>
                <style>{`
                  @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 242, 0.2); }
                    50% { box-shadow: 0 0 40px rgba(0, 255, 242, 0.5); }
                  }
                `}</style>
              </Paper>
            ) : (
              <Paper
                p="lg"
                style={{
                  backgroundColor: 'rgba(10, 10, 20, 0.6)',
                  border: '1px solid rgba(0, 255, 242, 0.15)',
                }}
              >
                <Stack gap="lg">
                  <Group gap="md">
                    <ThemeIcon
                      size={48}
                      variant="light"
                      color="cyan"
                      style={{
                        backgroundColor: 'rgba(0, 255, 242, 0.1)',
                        border: '1px solid rgba(0, 255, 242, 0.3)',
                      }}
                    >
                      <current.icon size={24} />
                    </ThemeIcon>
                    <div>
                      <Title order={3} c="white">
                        {current.title}
                      </Title>
                      <Text size="sm" c="dimmed">
                        Step {selectedStep + 1} of {STEPS.length}
                      </Text>
                    </div>
                  </Group>

                  <Text c="gray.4" size="md">
                    {current.description}
                  </Text>

                  {current.link && (
                    <Anchor component={Link} to={current.link} c="cyan" size="sm">
                      {current.linkLabel}
                    </Anchor>
                  )}

                  <div>
                    <Text size="sm" fw={600} c="white" mb="xs">
                      Tips
                    </Text>
                    <Stack gap="xs">
                      {current.tips.map((tip, i) => (
                        <Group key={i} gap="xs" align="flex-start" wrap="nowrap">
                          <Text c="cyan" size="sm" mt={2}>
                            *
                          </Text>
                          <Text size="sm" c="dimmed">
                            {tip}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  </div>

                  <Group>
                    <Button
                      variant={tutorialProgress[current.id] ? 'subtle' : 'gradient'}
                      gradient={{ from: 'cyan', to: 'teal' }}
                      color={tutorialProgress[current.id] ? 'gray' : undefined}
                      onClick={() => {
                        markTutorialStep(current.id);
                        if (selectedStep < STEPS.length - 1) {
                          setSelectedStep(selectedStep + 1);
                        }
                      }}
                    >
                      {tutorialProgress[current.id] ? 'Completed' : 'Mark Complete'}
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            )}
          </Grid.Col>
        </Grid>
      </Stack>
    </Box>
  );
}

export default TutorialPage;
