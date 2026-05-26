import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', fontFamily: '-apple-system, sans-serif',
          flexDirection: 'column', gap: '12px', color: '#666',
        }}>
          <div style={{ fontSize: '32px' }}>⚠</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Something went wrong</div>
          <div style={{ fontSize: '11px', color: '#999', maxWidth: '300px', textAlign: 'center' }}>
            {this.state.error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px', padding: '8px 16px', border: '1px solid #ddd',
              borderRadius: '6px', background: '#f5f5f5', cursor: 'pointer',
              fontSize: '11px', fontWeight: 500,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
