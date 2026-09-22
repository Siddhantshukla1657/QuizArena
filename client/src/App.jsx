import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './host/Dashboard';
import QuizBuilder from './host/QuizBuilder';
import Lobby from './host/Lobby';
import LiveQuestion from './host/LiveQuestion';
import Leaderboard from './host/Leaderboard';
import Join from './player/Join';
import Waiting from './player/Waiting';
import Question from './player/Question';
import Result from './player/Result';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Host routes */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/build/:quizId" element={<QuizBuilder />} />
        <Route path="/lobby/:pin" element={<Lobby />} />
        <Route path="/live/:pin" element={<LiveQuestion />} />
        <Route path="/results/:pin" element={<Leaderboard />} />

        {/* Player routes */}
        <Route path="/join" element={<Join />} />
        <Route path="/waiting" element={<Waiting />} />
        <Route path="/question" element={<Question />} />
        <Route path="/result" element={<Result />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
