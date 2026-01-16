import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';
import { Modals } from '@/components/modals';
import { DashboardLayout } from '@/pages/dashboard/layout';
import { HomePage } from '@/pages/dashboard/home';
import { ProjectsPage } from '@/pages/dashboard/projects';
import { TemplatesPage } from '@/pages/dashboard/templates';
import { EditorPage } from '@/pages/editor/editor-page';

function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Toaster />
        <Modals />
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
          </Route>
          <Route path="/editor/:projectId" element={<EditorPage />} />
        </Routes>
      </BrowserRouter>
    </Providers>
  );
}

export default App;
