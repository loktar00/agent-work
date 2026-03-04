import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader, Center } from '@mantine/core';
import { AppShellLayout } from '../layouts/AppShell';

const BoardListPage = lazy(() => import('../pages/BoardListPage'));
const BoardPage = lazy(() => import('../pages/BoardPage'));
const AgentsPage = lazy(() => import('../pages/AgentsPage'));
const ActivityFeedPage = lazy(() => import('../pages/ActivityFeedPage'));
const ApprovalPage = lazy(() => import('../pages/ApprovalPage'));
const ProjectThreadPage = lazy(() => import('../pages/ProjectThreadPage'));
const TutorialPage = lazy(() => import('../pages/TutorialPage'));

function PageLoader() {
  return (
    <Center h="100%">
      <Loader color="pink" type="dots" />
    </Center>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppShellLayout />}>
          <Route index element={<Navigate to="/boards" replace />} />
          <Route path="boards" element={<BoardListPage />} />
          <Route path="boards/:boardId" element={<BoardPage />} />
          <Route path="boards/:boardId/cards/:cardId" element={<BoardPage />} />
          <Route path="boards/:boardId/approve/:cardId" element={<ApprovalPage />} />
          <Route path="boards/:boardId/thread" element={<ProjectThreadPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="agents/:agentId" element={<AgentsPage />} />
          <Route path="activity" element={<ActivityFeedPage />} />
          <Route path="tutorial" element={<TutorialPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
