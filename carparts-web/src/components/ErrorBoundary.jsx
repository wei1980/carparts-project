// Error Boundary 元件
// 防止單一元件錯誤導致整個應用程式白屏

import React, { Component } from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // 記錄錯誤到 console (開發環境)
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
    }

    // 這裡可以整合 Sentry、LogRocket 等錯誤監控服務
    // 範例：Sentry.captureException(error, { extra: errorInfo });

    // 呼叫外部錯誤處理 callback
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // 如果 resetKeys 改變，重置錯誤狀態
    if (this.props.resetKeys && this.state.hasError) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.reset();
      }
    }

    // 如果 props 改變且啟用 resetOnPropsChange
    if (this.props.resetOnPropsChange && this.state.hasError) {
      this.reset();
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // 如果有自定義 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 預設錯誤 UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0f14] text-white">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-3">發生錯誤</h2>
            <p className="text-slate-400 mb-6">
              這個元件發生了問題，我們已記錄錯誤並會盡快修復。
            </p>
            <details className="text-left mb-6 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <summary className="cursor-pointer text-sm font-medium text-slate-300 mb-2">
                🔍 錯誤詳細資訊 (點擊展開)
              </summary>
              <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">
                {this.state.error?.message}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.reset}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                重試
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-colors border border-slate-600"
              >
                重新整理頁面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  onError: PropTypes.func,
  resetKeys: PropTypes.array,
  resetOnPropsChange: PropTypes.bool,
};

ErrorBoundary.defaultProps = {
  fallback: null,
  onError: null,
  resetKeys: null,
  resetOnPropsChange: false,
};

// 高階元件 (HOC) 版本 - 方便包裝頁面級元件
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
};

// 特定區域的錯誤邊界 (例如：側邊欄、模態框、特定卡片)
export const PartialErrorBoundary = ({
  children,
  fallback: FallbackComponent,
  onError,
  ...rest
}) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback((err, errorInfo) => {
    setHasError(true);
    setError(err);
    onError?.(err, errorInfo);
  }, [onError]);

  const handleReset = React.useCallback(() => {
    setHasError(false);
    setError(null);
  }, []);

  if (hasError) {
    if (FallbackComponent) {
      return <FallbackComponent error={error} onReset={handleReset} />;
    }

    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="flex items-center gap-3 text-red-300">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div className="flex-1">
            <p className="font-medium">元件載入失敗</p>
            <p className="text-sm text-slate-400">{error?.message}</p>
          </div>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={handleError} {...rest}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;