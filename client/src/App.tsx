import { useState } from 'react';
import { useClientId } from './hooks/useClientId';
import { useInfiniteItems } from './hooks/useInfiniteItems';
import { ItemsTable } from './components/ItemsTable';
import './App.css';

function App(): JSX.Element {
  const clientId = useClientId();
  const [query, setQuery] = useState('');
  
  const {
    items,
    isLoading,
    isEnd,
    error,
    fetchNext,
    reset: resetItems,
    updateItems,
  } = useInfiniteItems(clientId, query);

  const handleReset = () => {
    resetItems();
    setQuery('');
  };

  if (!clientId) {
    return (
      <div className="app">
        <div className="loading">Initializing...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Items List</h1>
        <p>Manage up to 1,000,000 items with selection, filtering, and drag-and-drop sorting</p>
      </header>

      <main className="app-main">
        <ItemsTable
          clientId={clientId}
          items={items}
          isLoading={isLoading}
          isEnd={isEnd}
          error={error}
          onFetchNext={fetchNext}
          onReset={handleReset}
          query={query}
          onQueryChange={setQuery}
          updateItems={updateItems}
          onReorder={() => {}} // Handled internally by ItemsTable
        />
      </main>
    </div>
  );
}

export default App;
