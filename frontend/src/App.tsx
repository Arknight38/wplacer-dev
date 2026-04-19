import { Outlet } from 'react-router-dom';
import { ToastContainer, useToast } from './components/ui';
import './index.css';
import './App.css';

function App() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="has-sidebar">
      <div className="container">
        <Outlet />
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
