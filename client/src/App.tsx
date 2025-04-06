import { Routes, Route, Link } from 'react-router-dom';
import EarTraining from './components/EarTraining';
import IntervalTrainer from './components/IntervalTrainer';
import './App.css';

function App() {
  return (
    <div className="app">
      <nav className="navigation">
        <Link to="/ear-training">Ear Training</Link>
        <Link to="/interval-trainer">Interval Trainer</Link>
      </nav>
      
      <Routes>
        <Route path="/ear-training" element={<EarTraining />} />
        <Route path="/interval-trainer" element={<IntervalTrainer />} />
        <Route path="/" element={<EarTraining />} />
      </Routes>
    </div>
  );
}

export default App;
