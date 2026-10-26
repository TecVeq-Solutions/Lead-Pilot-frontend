import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  viewName?: string;
  onReset?: () => void;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard React Error Boundary component for view-level error containment.
 * Prevents whole-app white screen crashes and offers clean in-place reloading.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.viewName || 'Component'}] caught error:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 m-4 bg-white border border-rose-200 rounded-2xl shadow-sm text-center min-h-[360px] space-y-5 animate-fade-in">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-xs">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="max-w-md space-y-1.5">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {this.props.viewName ? `${this.props.viewName} Encountered an Issue` : 'View Rendering Interrupted'}
            </h3>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              An unexpected error occurred while rendering this section. Your existing session and customer records remain completely secure.
            </p>
            {this.state.error?.message && (
              <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-left overflow-x-auto">
                <span className="text-[11px] font-mono text-slate-700 block truncate">
                  {this.state.error.message}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-[#0F9F8F] hover:bg-[#0B897D] text-white text-xs font-extrabold rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              Reload View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
