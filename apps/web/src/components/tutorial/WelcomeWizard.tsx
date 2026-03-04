import { useState } from 'react';
import {
  Modal,
  Stepper,
  Button,
  Group,
  Text,
  Title,
  Stack,
  Box,
  Loader,
} from '@mantine/core';
import { IconRocket, IconColumns, IconCards, IconCheck } from '@tabler/icons-react';
import { useCreateBoard } from '../../api/hooks/useBoards';
import { api } from '../../api/client';
import { useTutorialStore } from '../../stores/tutorialStore';

const COLUMN_NAMES = ['Backlog', 'In Progress', 'Review', 'Done'];

const SAMPLE_CARDS = [
  { title: 'Learn how to create boards', description: 'Explore the board creation flow' },
  { title: 'Set up your first agent', description: 'Connect an AI agent to automate tasks' },
  { title: 'Try drag and drop', description: 'Move cards between columns to update status' },
];

export function WelcomeWizard() {
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [columnIds, setColumnIds] = useState<string[]>([]);

  const hasCompletedWelcome = useTutorialStore((s) => s.hasCompletedWelcome);
  const completeWelcome = useTutorialStore((s) => s.completeWelcome);
  const startTour = useTutorialStore((s) => s.startTour);
  const setWelcomeBoardId = useTutorialStore((s) => s.setWelcomeBoardId);

  const createBoard = useCreateBoard();

  if (hasCompletedWelcome) return null;

  const handleCreateBoard = async () => {
    setLoading(true);
    try {
      const board = await createBoard.mutateAsync({
        name: 'Getting Started',
        description: 'Your first board - created by the welcome wizard',
      });
      const id = (board as { id: string }).id;
      setBoardId(id);
      setWelcomeBoardId(id);
      setActive(2);
    } catch {
      // If board creation fails, still advance so user isn't stuck
      setActive(2);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateColumns = async () => {
    if (!boardId) {
      setActive(3);
      return;
    }
    setLoading(true);
    try {
      const ids: string[] = [];
      for (let i = 0; i < COLUMN_NAMES.length; i++) {
        const col = await api.post<{ id: string }>(`/api/boards/${boardId}/columns`, {
          name: COLUMN_NAMES[i],
          position: i,
          boardId,
        });
        ids.push(col.id);
      }
      setColumnIds(ids);
      setActive(3);
    } catch {
      setActive(3);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCards = async () => {
    if (!boardId || columnIds.length === 0) {
      setActive(4);
      return;
    }
    setLoading(true);
    try {
      const backlogId = columnIds[0];
      for (const card of SAMPLE_CARDS) {
        await api.post(`/api/boards/${boardId}/cards`, {
          title: card.title,
          description: card.description,
          columnId: backlogId,
        });
      }
      setActive(4);
    } catch {
      setActive(4);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = (withTour: boolean) => {
    completeWelcome();
    if (withTour) startTour();
  };

  const handleSkip = () => {
    completeWelcome();
  };

  return (
    <Modal
      opened
      onClose={handleSkip}
      size="lg"
      centered
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          background: 'linear-gradient(135deg, #0a0a14 0%, #12122a 100%)',
          border: '1px solid rgba(0, 255, 242, 0.3)',
          boxShadow: '0 0 40px rgba(0, 255, 242, 0.1)',
        },
        header: { background: 'transparent' },
        body: { padding: '1.5rem' },
      }}
    >
      <Stepper
        active={active}
        onStepClick={setActive}
        color="cyan"
        size="sm"
        allowNextStepsSelect={false}
        styles={{
          stepIcon: { backgroundColor: '#1a1a2e', borderColor: 'rgba(0, 255, 242, 0.4)' },
          separator: { backgroundColor: 'rgba(0, 255, 242, 0.2)' },
          stepLabel: { color: '#e0e0e0' },
        }}
      >
        {/* Step 1: Welcome */}
        <Stepper.Step label="Welcome" icon={<IconRocket size={18} />}>
          <Stack align="center" gap="lg" py="xl">
            <Title
              order={1}
              style={{
                fontFamily: "'Orbitron', sans-serif",
                background: 'linear-gradient(90deg, #00fff2, #ff00e5)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '2.2rem',
              }}
            >
              NEONSYNC
            </Title>
            <Text c="dimmed" ta="center" size="lg" maw={400}>
              Your AI-powered project board. Manage tasks, orchestrate agents,
              and ship faster with intelligent automation.
            </Text>
            <Button
              variant="gradient"
              gradient={{ from: 'cyan', to: 'pink' }}
              size="lg"
              onClick={() => setActive(1)}
            >
              Get Started
            </Button>
          </Stack>
        </Stepper.Step>

        {/* Step 2: Create Board */}
        <Stepper.Step label="Board" icon={<IconColumns size={18} />}>
          <Stack align="center" gap="lg" py="xl">
            <Title order={3} c="white">
              Create Your First Board
            </Title>
            <Text c="dimmed" ta="center" maw={400}>
              Boards organize your work into columns and cards.
              Let's create a "Getting Started" board to explore the features.
            </Text>
            <Button
              variant="gradient"
              gradient={{ from: 'cyan', to: 'teal' }}
              size="md"
              onClick={handleCreateBoard}
              loading={loading}
              disabled={!!boardId}
            >
              {boardId ? 'Board Created!' : 'Create Board'}
            </Button>
          </Stack>
        </Stepper.Step>

        {/* Step 3: Set Up Columns */}
        <Stepper.Step label="Columns" icon={<IconColumns size={18} />}>
          <Stack align="center" gap="lg" py="xl">
            <Title order={3} c="white">
              Set Up Workflow Columns
            </Title>
            <Text c="dimmed" ta="center" maw={400}>
              Columns represent stages in your workflow. We'll create
              Backlog, In Progress, Review, and Done columns.
            </Text>
            <Group>
              {COLUMN_NAMES.map((name) => (
                <Box
                  key={name}
                  px="md"
                  py="xs"
                  style={{
                    border: '1px solid rgba(0, 255, 242, 0.3)',
                    borderRadius: 8,
                    color: '#00fff2',
                    fontSize: '0.85rem',
                  }}
                >
                  {name}
                </Box>
              ))}
            </Group>
            <Button
              variant="gradient"
              gradient={{ from: 'cyan', to: 'teal' }}
              size="md"
              onClick={handleCreateColumns}
              loading={loading}
              disabled={columnIds.length > 0}
            >
              {columnIds.length > 0 ? 'Columns Created!' : 'Create Columns'}
            </Button>
          </Stack>
        </Stepper.Step>

        {/* Step 4: Add Sample Cards */}
        <Stepper.Step label="Cards" icon={<IconCards size={18} />}>
          <Stack align="center" gap="lg" py="xl">
            <Title order={3} c="white">
              Add Sample Cards
            </Title>
            <Text c="dimmed" ta="center" maw={400}>
              Cards represent individual tasks or work items.
              We'll add some sample cards to get you started.
            </Text>
            {loading && <Loader color="cyan" size="sm" />}
            <Button
              variant="gradient"
              gradient={{ from: 'cyan', to: 'teal' }}
              size="md"
              onClick={handleCreateCards}
              loading={loading}
            >
              Add Sample Cards
            </Button>
          </Stack>
        </Stepper.Step>

        {/* Step 5: Complete */}
        <Stepper.Completed>
          <Stack align="center" gap="lg" py="xl">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(0, 255, 242, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #00fff2',
                boxShadow: '0 0 20px rgba(0, 255, 242, 0.3)',
              }}
            >
              <IconCheck size={32} color="#00fff2" />
            </Box>
            <Title order={3} c="white">
              You're All Set!
            </Title>
            <Text c="dimmed" ta="center" maw={400}>
              Your board is ready. Take a quick tour to learn the interface,
              or jump right in and start exploring.
            </Text>
            <Group>
              <Button
                variant="gradient"
                gradient={{ from: 'cyan', to: 'pink' }}
                size="md"
                onClick={() => handleFinish(true)}
              >
                Start Tour
              </Button>
              <Button
                variant="subtle"
                color="gray"
                size="md"
                onClick={() => handleFinish(false)}
              >
                Skip Tour
              </Button>
            </Group>
          </Stack>
        </Stepper.Completed>
      </Stepper>

      {/* Skip button visible on all steps except completed */}
      {active < 4 && (
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" color="gray" size="xs" onClick={handleSkip}>
            Skip Setup
          </Button>
        </Group>
      )}
    </Modal>
  );
}
