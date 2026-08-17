import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Placeholder } from './pages/Placeholder.jsx';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="people" element={<Placeholder title="People" />} />
        <Route path="companies" element={<Placeholder title="Companies" />} />
        <Route path="lists" element={<Placeholder title="Lists" />} />
        <Route path="sequences" element={<Placeholder title="Sequences" />} />
        <Route path="billing" element={<Placeholder title="Billing" />} />
      </Route>
    </Routes>
  );
}
