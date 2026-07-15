import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900 p-6">
          <div className="glass-card max-w-2xl w-full p-8 border border-rose-500/20 bg-rose-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl" />
            <h3 className="text-xl font-display font-bold text-rose-400 mb-2">Something went wrong</h3>
            <p className="text-gray-300 text-sm mb-4 leading-relaxed font-semibold">
              The application encountered a rendering error. Details are shown below:
            </p>
            <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2">
              <p className="text-rose-300 text-xs font-mono font-bold">
                {this.state.error?.toString()}
              </p>
              {this.state.errorInfo && (
                <pre className="text-gray-400 text-[10px] font-mono overflow-auto max-h-[250px] leading-normal pt-2 border-t border-white/5">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => window.location.reload()}
                className="btn-danger !px-6"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
