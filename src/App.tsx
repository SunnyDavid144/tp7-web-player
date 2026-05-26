import { TP7Player } from './components/TP7Player';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="app">
        <TP7Player />
      </div>
    </ErrorBoundary>
  );
}

export default App;
