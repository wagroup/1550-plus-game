import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './api';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import QuestionSets from './pages/QuestionSets';
import CreateGame from './pages/CreateGame';
import Host from './pages/Host';
import Projector from './pages/Projector';
import Join from './pages/Join';
import Play from './pages/Play';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/join" element={<Join />} />
      <Route path="/join/:code" element={<Join />} />
      <Route path="/play/:code" element={<Play />} />
      <Route path="/projector/:code" element={<Projector />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/question-sets" element={<RequireAuth><QuestionSets /></RequireAuth>} />
      <Route path="/create-game" element={<RequireAuth><CreateGame /></RequireAuth>} />
      <Route path="/host/:code" element={<RequireAuth><Host /></RequireAuth>} />
      <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
      <Route path="/reports/:id" element={<RequireAuth><ReportDetail /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
